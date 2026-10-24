import { getEventsSitemapData } from '@/lib/payload/sitemap-data'
import { getServerSideURL } from '@/utilities/getURL'
import { renderSitemapXml, sitemapResponse } from '@/utilities/sitemapXml'
import { connection } from 'next/server'

export async function GET(): Promise<Response> {
  await connection()
  const entries = await getEventsSitemapData()
  return sitemapResponse(renderSitemapXml(entries, getServerSideURL()))
}
