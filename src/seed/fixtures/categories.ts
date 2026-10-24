const categoryRows = [
  ['news-general', 'news', 'أخبار عامة', 'General News'],
  ['news-academic', 'news', 'أخبار أكاديمية', 'Academic News'],
  ['news-research', 'news', 'أخبار البحث العلمي', 'Research News'],
  ['news-students', 'news', 'أخبار الطلاب', 'Student News'],
  ['event-academic', 'event', 'أكاديمي', 'Academic'],
  ['event-cultural', 'event', 'ثقافي', 'Cultural'],
  ['event-sports', 'event', 'رياضي', 'Sports'],
  ['event-social', 'event', 'اجتماعي', 'Social'],
  ['offer-academic', 'offer', 'أكاديمي', 'Academic'],
  ['offer-scholarship', 'offer', 'منحة دراسية', 'Scholarship'],
  ['offer-training', 'offer', 'تدريب', 'Training'],
  ['offer-discount', 'offer', 'خصم', 'Discount'],
  ['project-graduation', 'project', 'مشاريع تخرج', 'Graduation Projects'],
  ['project-research', 'project', 'مشاريع بحثية', 'Research Projects'],
  ['blog-general', 'blog', 'مدونة عامة', 'General Blog'],
  ['blog-academic', 'blog', 'مدونة أكاديمية', 'Academic Blog'],
  ['faq-admission', 'faq', 'القبول والتسجيل', 'Admission'],
  ['faq-fees', 'faq', 'الرسوم', 'Fees'],
  ['faq-academic', 'faq', 'الشؤون الأكاديمية', 'Academic'],
  ['faq-campus', 'faq', 'الحياة الجامعية', 'Campus Life'],
] as const

export const categoryFixtures = categoryRows.map(([slug, kind, ar, en]) => ({
  kind,
  name: { ar, en },
  slug,
}))
