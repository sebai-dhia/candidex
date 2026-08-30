/**
 * Capture overlay chrome strings (UI only — not job content).
 * Locale from candidexLocale (read via background when storage is locked).
 */

import { getContentPrefs } from '../storage/content-prefs.js';

export const CAPTURE_LOCALE_KEY = 'candidexLocale';

/** @typedef {'en'|'fr'|'ar'|'zh'} CaptureLocale */

/** @type {Record<string, Record<CaptureLocale, string>>} */
const MESSAGES = {
  'capture.instruction': {
    en: 'Draw a box around the job details · Esc to cancel',
    fr: 'Entourez les détails du poste · Échap pour annuler',
    ar: 'ارسم مربعًا حول تفاصيل الوظيفة · Esc للإلغاء',
    zh: '框选职位详情 · Esc 取消'
  },
  'capture.recapture': {
    en: 'Recapture',
    fr: 'Reprendre',
    ar: 'إعادة الالتقاط',
    zh: '重新捕获'
  },
  'capture.extract': {
    en: 'Extract Info',
    fr: 'Extraire',
    ar: 'استخراج المعلومات',
    zh: '提取信息'
  },
  'capture.processing': {
    en: 'Processing job info...',
    fr: 'Analyse de l’offre...',
    ar: '...جاري معالجة معلومات الوظيفة',
    zh: '正在处理职位信息...'
  },
  'capture.reviewTitle': {
    en: 'Review Extracted Data',
    fr: 'Vérifier les données extraites',
    ar: 'مراجعة البيانات المستخرجة',
    zh: '核对提取的数据'
  },
  'capture.reviewSubtitle': {
    en: 'Verify and adjust the details before saving · Esc to cancel',
    fr: 'Vérifiez et ajustez avant d’enregistrer · Échap pour annuler',
    ar: 'تحقق وعدّل التفاصيل قبل الحفظ · Esc للإلغاء',
    zh: '保存前请核对并调整 · Esc 取消'
  },
  'capture.jobTitle': {
    en: 'Job Title',
    fr: 'Intitulé',
    ar: 'المسمى الوظيفي',
    zh: '职位名称'
  },
  'capture.company': {
    en: 'Company',
    fr: 'Entreprise',
    ar: 'الشركة',
    zh: '公司'
  },
  'capture.location': {
    en: 'Location / Country',
    fr: 'Lieu / Pays',
    ar: 'الموقع / البلد',
    zh: '地点 / 国家'
  },
  'capture.workType': {
    en: 'Work Type',
    fr: 'Type de travail',
    ar: 'نوع العمل',
    zh: '工作类型'
  },
  'capture.platform': {
    en: 'Platform',
    fr: 'Plateforme',
    ar: 'المنصة',
    zh: '平台'
  },
  'capture.notes': {
    en: 'Notes (Optional)',
    fr: 'Notes (optionnel)',
    ar: 'ملاحظات (اختياري)',
    zh: '备注（可选）'
  },
  'capture.save': {
    en: 'Save to Candidex',
    fr: 'Enregistrer dans Candidex',
    ar: 'Candidex حفظ في',
    zh: '保存到 Candidex'
  },
  'capture.discard': {
    en: 'Discard',
    fr: 'Ignorer',
    ar: 'تجاهل',
    zh: '丢弃'
  },
  'capture.retake': {
    en: 'Retake Capture',
    fr: 'Reprendre la capture',
    ar: 'إعادة الالتقاط',
    zh: '重新捕获'
  },
  'capture.aiFailed': {
    en: 'AI extraction failed',
    fr: 'Échec de l’extraction IA',
    ar: 'فشل الاستخراج بالذكاء الاصطناعي',
    zh: 'AI 提取失败'
  },
  'capture.overallConfidence': {
    en: '{value}% Overall confidence',
    fr: '{value}% de confiance globale',
    ar: '{value}% الثقة الإجمالية',
    zh: '总体置信度 {value}%'
  },
  'capture.reviewNeeded': {
    en: 'Review Needed',
    fr: 'À vérifier',
    ar: 'يحتاج مراجعة',
    zh: '需核对'
  },
  'capture.highConfidence': {
    en: 'High Confidence',
    fr: 'Haute confiance',
    ar: 'ثقة عالية',
    zh: '高置信度'
  },
  'capture.notFound': {
    en: 'Not Found',
    fr: 'Non trouvé',
    ar: 'غير موجود',
    zh: '未找到'
  },
  'capture.selectWorkType': {
    en: 'Select work type',
    fr: 'Choisir le type',
    ar: 'اختر نوع العمل',
    zh: '选择工作类型'
  },
  'capture.privacyTitle': {
    en: 'Your data is private & secure',
    fr: 'Vos données sont privées et sécurisées',
    ar: 'بياناتك خاصة وآمنة',
    zh: '您的数据私密且安全'
  },
  'capture.privacyDesc': {
    en: 'The screenshot and extracted data are processed securely and not stored.',
    fr: 'La capture et les données extraites sont traitées de façon sécurisée et non stockées.',
    ar: 'تتم معالجة لقطة الشاشة والبيانات المستخرجة بأمان ولا تُخزَّن.',
    zh: '截图与提取数据经安全处理且不会被存储。'
  },
  'capture.savedTitle': {
    en: 'Application saved successfully',
    fr: 'Candidature enregistrée',
    ar: 'تم حفظ الطلب بنجاح',
    zh: '申请已保存'
  },
  'capture.savedSubtitle': {
    en: 'Your AI capture has been added to Candidex.',
    fr: 'Votre capture IA a été ajoutée à Candidex.',
    ar: 'Candidex تمت إضافة التقاط الذكاء الاصطناعي إلى',
    zh: 'AI 捕获已添加到 Candidex。'
  },
  'capture.saved': {
    en: 'Saved',
    fr: 'Enregistré',
    ar: 'تم الحفظ',
    zh: '已保存'
  },
  'capture.saveFailed': {
    en: 'Failed to save',
    fr: 'Échec de l’enregistrement',
    ar: 'فشل الحفظ',
    zh: '保存失败'
  },
  'capture.saving': {
    en: 'Saving...',
    fr: 'Enregistrement...',
    ar: 'جارٍ الحفظ...',
    zh: '保存中...'
  },
  'capture.roleCompanyRequired': {
    en: 'Job Title and Company are required.',
    fr: 'L’intitulé et l’entreprise sont obligatoires.',
    ar: 'المسمى الوظيفي والشركة مطلوبان.',
    zh: '职位名称和公司为必填项。'
  },
  'capture.openFailed': {
    en: 'Could not open Candidex to save this application.',
    fr: 'Impossible d’ouvrir Candidex pour enregistrer cette candidature.',
    ar: 'تعذر فتح Candidex لحفظ هذا الطلب.',
    zh: '无法打开 Candidex 以保存此申请。'
  },
  'capture.duplicateWarning': {
    en: 'You already tracked {role} at {company}.',
    fr: 'Vous suivez déjà {role} chez {company}.',
    ar: 'لقد تتبّعت بالفعل {role} في {company}.',
    zh: '你已跟踪过 {company} 的 {role}。'
  },
  'capture.duplicateTitle': {
    en: 'Already tracked',
    fr: 'Déjà suivi',
    ar: 'متتبَّع مسبقاً',
    zh: '已跟踪'
  },
  'capture.duplicateAppliedOn': {
    en: 'Applied on {date}',
    fr: 'Candidature le {date}',
    ar: 'تم التقديم في {date}',
    zh: '申请日期：{date}'
  },
  'capture.viewExisting': {
    en: 'View existing',
    fr: 'Voir l’existante',
    ar: 'عرض الموجود',
    zh: '查看已有记录'
  },
  'capture.saveAnyway': {
    en: 'Save anyway',
    fr: 'Enregistrer quand même',
    ar: 'حفظ على أي حال',
    zh: '仍要保存'
  },
  'capture.placeholderRole': {
    en: 'Role / title',
    fr: 'Intitulé du poste',
    ar: 'المسمى الوظيفي',
    zh: '职位名称'
  },
  'capture.placeholderCompany': {
    en: 'Company name',
    fr: 'Nom de l’entreprise',
    ar: 'اسم الشركة',
    zh: '公司名称'
  },
  'capture.placeholderLocation': {
    en: 'Location / country',
    fr: 'Lieu / pays',
    ar: 'الموقع / البلد',
    zh: '地点 / 国家'
  },
  'capture.placeholderPlatform': {
    en: 'e.g. LinkedIn',
    fr: 'ex. LinkedIn',
    ar: 'مثال: LinkedIn',
    zh: '例如 LinkedIn'
  },
  'capture.placeholderNotes': {
    en: 'Add notes…',
    fr: 'Ajouter des notes…',
    ar: 'أضف ملاحظات…',
    zh: '添加备注…'
  },
  'capture.workTypeRemote': {
    en: 'Remote',
    fr: 'Télétravail',
    ar: 'عن بُعد',
    zh: '远程'
  },
  'capture.workTypeHybrid': {
    en: 'Hybrid',
    fr: 'Hybride',
    ar: 'هجين',
    zh: '混合'
  },
  'capture.workTypeOnsite': {
    en: 'On-site',
    fr: 'Sur site',
    ar: 'حضوري',
    zh: '现场'
  },
  'capture.extractionFailed': {
    en: 'Extraction failed: {error}',
    fr: 'Échec de l’extraction : {error}',
    ar: 'فشل الاستخراج: {error}',
    zh: '提取失败：{error}'
  },
};

const WORK_TYPE_LABEL_KEYS = {
  Remote: 'capture.workTypeRemote',
  Hybrid: 'capture.workTypeHybrid',
  'On-site': 'capture.workTypeOnsite'
};

/** @type {CaptureLocale} */
let cachedLocale = 'en';

/**
 * @returns {Promise<CaptureLocale>}
 */
export async function loadCaptureLocale() {
  try {
    const prefs = await getContentPrefs();
    const value = prefs.candidexLocale;
    if (value === 'en' || value === 'fr' || value === 'ar' || value === 'zh') {
      cachedLocale = value;
      return value;
    }
  } catch {
    // Fall through to default.
  }
  cachedLocale = 'en';
  return 'en';
}

/**
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 */
export function tCapture(key, params = {}) {
  const entry = MESSAGES[key];
  let text = entry?.[cachedLocale] || entry?.en || key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
  }
  return text;
}

export function getCachedCaptureLocale() {
  return cachedLocale;
}

/**
 * Localized label for a canonical work-type value.
 * @param {string} value
 */
export function workTypeDisplayLabel(value) {
  const key = WORK_TYPE_LABEL_KEYS[value];
  return key ? tCapture(key) : value;
}