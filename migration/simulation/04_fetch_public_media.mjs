#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

const root = process.argv[2] || path.resolve('migration-simulation-output')
const manifestPath = new URL('./03_public_media_manifest.csv', import.meta.url)
const uploadsRoot = path.join(root, 'uploads')
const checksumPath = path.join(root, 'PUBLIC_MEDIA_SHA256SUMS')
const concurrency = Number(process.env.MEDIA_FETCH_CONCURRENCY || 12)
const timeoutMs = Number(process.env.MEDIA_FETCH_TIMEOUT_MS || 30_000)
const maxAttempts = Number(process.env.MEDIA_FETCH_ATTEMPTS || 3)

function parseCSV(text) {
  const rows=[]; let row=[], field='', quoted=false
  for(let i=0;i<text.length;i++){
    const c=text[i]
    if(quoted){
      if(c === '"' && text[i+1] === '"'){ field+='"'; i++ }
      else if(c === '"') quoted=false
      else field+=c
    } else {
      if(c === '"') quoted=true
      else if(c === ','){ row.push(field); field='' }
      else if(c === '\n'){ row.push(field); rows.push(row); row=[]; field='' }
      else if(c !== '\r') field+=c
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row) }
  const [header,...data]=rows.filter(r=>r.length && r.some(v=>v!==''))
  return data.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])))
}

async function sha256(file) {
  const h=createHash('sha256')
  for await (const chunk of createReadStream(file)) h.update(chunk)
  return h.digest('hex')
}

async function fetchWithRetry(url, target) {
  let lastError
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{
      const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(timeoutMs)})
      if(!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
      await pipeline(response.body,createWriteStream(target))
      return
    }catch(error){
      lastError=error
      await rm(target,{force:true})
      if(attempt<maxAttempts) await new Promise(r=>setTimeout(r,500*attempt))
    }
  }
  throw new Error(`Failed after ${maxAttempts} attempts: ${url}: ${lastError?.message || lastError}`)
}

const rows=parseCSV(await readFile(manifestPath,'utf8'))
if(!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error('MEDIA_FETCH_CONCURRENCY must be 1..32')
// Never delete an output root an operator handed us. `root` is argv[2], and
// migration/RUNBOOK.md invokes this with a real path on the staging VPS
// (`/srv/aau/staging/public-media`) — one wrong argument away from the live
// uploads tree, which this line would have destroyed before a single byte was
// downloaded. The rule is `migration/scripts/neon-export.sh`'s, verbatim: an
// existing directory with anything in it is somebody's data or somebody's
// evidence, so refuse and make the operator name a new one. No override, for
// the same reason the export has none.
// Only ENOENT means "no such root". A catch-all here would turn EACCES or EIO
// — "I could not look" — into "nothing is there", and walk straight past the
// non-empty check below into a directory whose contents were never observed.
// That is the exact failure this guard exists to prevent, so it fails closed.
let existing = null
try {
  existing = await stat(root)
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
if (existing) {
  if (!existing.isDirectory()) throw new Error(`${root} exists and is not a directory`)
  if ((await readdir(root)).length) {
    throw new Error(`${root} is not empty; choose a new output directory`)
  }
}
await mkdir(uploadsRoot,{recursive:true})

const sums=new Array(rows.length)
let downloadedBytes=0
let cursor=0
let completed=0

async function worker(){
  for(;;){
    const i=cursor++
    if(i>=rows.length) return
    const row=rows[i]
    const target=path.resolve(uploadsRoot,row.target_relative_path)
    const rel=path.relative(uploadsRoot,target)
    if(!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`Unsafe target path: ${row.target_relative_path}`)
    await mkdir(path.dirname(target),{recursive:true})

    await fetchWithRetry(row.source_url,target)
    const actual=(await stat(target)).size
    const expected=Number(row.expected_filesize)
    if(actual!==expected) throw new Error(`Size mismatch for ${row.target_relative_path}: expected ${expected}, got ${actual}`)
    const hash=await sha256(target)
    sums[i]=`${hash}  uploads/${row.target_relative_path}`
    downloadedBytes+=actual
    completed++
    if(completed%50===0 || completed===rows.length) console.log(`verified ${completed}/${rows.length}`)
  }
}

await Promise.all(Array.from({length:Math.min(concurrency,rows.length)},()=>worker()))
await writeFile(checksumPath,sums.join('\n')+'\n',{mode:0o600})
console.log(JSON.stringify({objects:rows.length,bytes:downloadedBytes,checksumFile:checksumPath,concurrency},null,2))
