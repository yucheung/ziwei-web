export interface PalaceKnowledgeEntry {
  palaceName: string;
  knowledgeId: string;
  source: 'iztro-sanhe-v1';
  school: 'sanhe';
  ruleSetVersion: 'sanhe-v1';
  themes: string[];
  bodyPart: string;
  lifeDomain: string;
}

const PALACE_KNOWLEDGE: PalaceKnowledgeEntry[] = [
  {
    palaceName: '命宮',
    knowledgeId: 'palace-ming',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['性格氣質', '人生主軸', '自我認同'],
    bodyPart: '頭面與神志',
    lifeDomain: 'personality',
  },
  {
    palaceName: '兄弟',
    knowledgeId: 'palace-siblings',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['手足關係', '同儕互動', '支援網絡'],
    bodyPart: '手臂與肩胛',
    lifeDomain: 'siblings-and-support',
  },
  {
    palaceName: '夫妻',
    knowledgeId: 'palace-spouse',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['伴侶關係', '婚姻互動', '親密承諾'],
    bodyPart: '心與胸部',
    lifeDomain: 'relationships',
  },
  {
    palaceName: '子女',
    knowledgeId: 'palace-children',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['子女緣分', '教養互動', '創造力與作品'],
    bodyPart: '腎與生殖系統',
    lifeDomain: 'children-and-creativity',
  },
  {
    palaceName: '財帛',
    knowledgeId: 'palace-wealth',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['收入模式', '資源管理', '價值取捨'],
    bodyPart: '口與脾胃',
    lifeDomain: 'finances',
  },
  {
    palaceName: '疾厄',
    knowledgeId: 'palace-health',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['身心狀態', '生活習慣', '壓力與恢復'],
    bodyPart: '臟腑與身體整體',
    lifeDomain: 'health',
  },
  {
    palaceName: '遷移',
    knowledgeId: 'palace-migration',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['外出發展', '環境適應', '他人眼中的形象'],
    bodyPart: '腿足與筋骨',
    lifeDomain: 'mobility-and-environment',
  },
  {
    palaceName: '僕役',
    knowledgeId: 'palace-friends',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['朋友互動', '合作關係', '部屬與社群'],
    bodyPart: '四肢與肩臂',
    lifeDomain: 'friends-and-networks',
  },
  {
    palaceName: '官祿',
    knowledgeId: 'palace-career',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['職業方向', '工作表現', '責任與成就'],
    bodyPart: '筋骨與神經',
    lifeDomain: 'career',
  },
  {
    palaceName: '田宅',
    knowledgeId: 'palace-property',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['居住環境', '家庭根基', '不動產與資產'],
    bodyPart: '腹部與脾胃',
    lifeDomain: 'home-and-property',
  },
  {
    palaceName: '福德',
    knowledgeId: 'palace-spirit',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['精神享受', '內在安定', '休閒與福分'],
    bodyPart: '腦與精神',
    lifeDomain: 'wellbeing',
  },
  {
    palaceName: '父母',
    knowledgeId: 'palace-parents',
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    themes: ['親子關係', '長輩緣分', '權威與文書'],
    bodyPart: '耳目與頭部',
    lifeDomain: 'parents-and-authority',
  },
];

const PALACE_ALIASES: Record<string, string> = { 交友: '僕役', 本命命宮: '命宮' };
const PALACE_KNOWLEDGE_BY_NAME = new Map(PALACE_KNOWLEDGE.map((entry) => [entry.palaceName, entry]));

export function getPalaceKnowledge(palaceName: string): PalaceKnowledgeEntry | undefined {
  return PALACE_KNOWLEDGE_BY_NAME.get(PALACE_ALIASES[palaceName] ?? palaceName);
}
