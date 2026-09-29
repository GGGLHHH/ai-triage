import type { BodyRegion, Sex, Symptom } from '../types'

// ponytail: 医疗美容科的部位与诉求→门诊映射是按常识写的演示数据,未经院方审核;上线前由科室校对这一个文件。
// 门诊编号见 ../hospital.md。

export const WHOLE_BODY = 'whole'

export const regions: BodyRegion[] = [
  { id: 'scalp', common: '头发 / 头皮', formal: '头皮与毛发', group: '头颈' },
  { id: 'face', common: '脸', formal: '面部', group: '头颈' },
  { id: 'eye', common: '眼睛周围', formal: '眼周', group: '头颈' },
  { id: 'nose', common: '鼻子', formal: '鼻部', group: '头颈' },
  { id: 'mouth', common: '嘴唇 / 嘴周', formal: '唇周', group: '头颈' },
  { id: 'ear', common: '耳朵', formal: '耳廓', group: '头颈' },
  { id: 'neck', common: '脖子', formal: '颈部', group: '头颈' },
  { id: 'breast', common: '胸部', formal: '乳房 / 乳头乳晕', group: '躯干' },
  { id: 'armpit', common: '胳肢窝', formal: '腋部', group: '躯干' },
  { id: 'abdomen', common: '肚子', formal: '腹部', group: '躯干' },
  { id: 'back', common: '后背', formal: '背部', group: '躯干' },
  { id: 'buttocks', common: '屁股', formal: '臀部', group: '躯干' },
  { id: 'privateFemale', common: '私密处', formal: '女性私密部位', group: '躯干', sex: 'female' },
  { id: 'privateMale', common: '私密处', formal: '男性私密部位', group: '躯干', sex: 'male' },
  { id: 'arm', common: '胳膊', formal: '上肢', group: '四肢' },
  { id: 'hand', common: '手', formal: '手部', group: '四肢' },
  { id: 'leg', common: '腿', formal: '下肢', group: '四肢' },
  { id: WHOLE_BODY, common: '全身 / 其他', formal: '全身与其他诉求', group: '全身' },
]

const EMBOLISM = '注射后可能出现血管栓塞,有皮肤坏死甚至失明的风险,请立即联系为你注射的机构并到急诊就医'

export const symptoms: Symptom[] = [
  { id: 'hairLoss', regionId: 'scalp', name: '脱发 / 头发变稀', departmentIds: ['hair', 'fue'] },
  { id: 'hairline', regionId: 'scalp', name: '发际线高', departmentIds: ['fue', 'hair'] },
  { id: 'scarNoHair', regionId: 'scalp', name: '头皮疤痕处不长头发', departmentIds: ['scarHair'] },

  { id: 'wrinkles', regionId: 'face', name: '皱纹 / 法令纹', departmentIds: ['faceYouth', 'botox'] },
  { id: 'sagging', regionId: 'face', name: '皮肤松弛下垂', departmentIds: ['faceYouth'] },
  { id: 'spots', regionId: 'face', name: '色斑 / 黄褐斑 / 雀斑', departmentIds: ['pigment'] },
  { id: 'birthmark', regionId: 'face', name: '胎记 / 太田痣', departmentIds: ['pigment'] },
  { id: 'redness', regionId: 'face', name: '红血丝 / 脸容易发红', departmentIds: ['vascular'] },
  { id: 'acneScar', regionId: 'face', name: '痘印 / 痘坑', departmentIds: ['laser'] },
  { id: 'acne', regionId: 'face', name: '反复长痘、气色差想调理', departmentIds: ['tcm'] },
  { id: 'jaw', regionId: 'face', name: '咬肌大 / 想瘦脸', departmentIds: ['botox'] },
  { id: 'brows', regionId: 'face', name: '眉毛稀少', departmentIds: ['fue'] },
  { id: 'faceEmbolism', regionId: 'face', name: '注射后皮肤发白发紫、剧痛', departmentIds: ['general'], redFlag: EMBOLISM },

  { id: 'eyeBags', regionId: 'eye', name: '眼袋 / 黑眼圈', departmentIds: ['eyeAging'] },
  { id: 'crowsFeet', regionId: 'eye', name: '鱼尾纹', departmentIds: ['botox', 'eyeAging'] },
  { id: 'eyelid', regionId: 'eye', name: '眼皮松弛 / 上睑下垂', departmentIds: ['eyeAging'] },
  { id: 'visionLoss', regionId: 'eye', name: '注射后视力下降 / 看不清', departmentIds: ['general'], redFlag: EMBOLISM },

  { id: 'noseRed', regionId: 'nose', name: '鼻头发红 / 酒渣鼻', departmentIds: ['vascular', 'tcm'] },
  { id: 'noseShape', regionId: 'nose', name: '对鼻子外形不满意', departmentIds: ['general'] },

  { id: 'mouthLines', regionId: 'mouth', name: '嘴周皱纹', departmentIds: ['botox', 'faceYouth'] },
  { id: 'lipColor', regionId: 'mouth', name: '唇色暗沉 / 唇部色素', departmentIds: ['pigment'] },

  { id: 'accessoryEar', regionId: 'ear', name: '耳前多长了小肉赘(附耳)', departmentIds: ['ear'] },
  { id: 'microtia', regionId: 'ear', name: '耳朵形状小或不完整(小耳)', departmentIds: ['ear'] },

  { id: 'neckLines', regionId: 'neck', name: '颈纹', departmentIds: ['faceYouth', 'botox'] },
  { id: 'neckSpots', regionId: 'neck', name: '脖子上的色斑 / 色沉', departmentIds: ['pigment'] },

  { id: 'breastSag', regionId: 'breast', name: '乳房下垂 / 不对称', departmentIds: ['breast'], sex: 'female' },
  { id: 'breastSize', regionId: 'breast', name: '对乳房大小不满意', departmentIds: ['breast'], sex: 'female' },
  { id: 'nipple', regionId: 'breast', name: '乳头内陷 / 乳晕过大', departmentIds: ['breast'] },
  { id: 'gynecomastia', regionId: 'breast', name: '男性乳房发育', departmentIds: ['breast'], sex: 'male' },

  { id: 'odor', regionId: 'armpit', name: '狐臭 / 腋臭', departmentIds: ['axilla'] },
  { id: 'sweat', regionId: 'armpit', name: '腋下出汗多', departmentIds: ['axilla', 'botox'] },
  { id: 'accessoryBreast', regionId: 'armpit', name: '副乳', departmentIds: ['axilla', 'breast'], sex: 'female' },

  { id: 'stretchMarks', regionId: 'abdomen', name: '妊娠纹 / 肥胖纹', departmentIds: ['laser'] },
  { id: 'surgeryScar', regionId: 'abdomen', name: '手术疤痕', departmentIds: ['laser'] },
  { id: 'bellyFat', regionId: 'abdomen', name: '腰腹赘肉想塑形', departmentIds: ['general'] },

  { id: 'backAcne', regionId: 'back', name: '背部痘痘 / 痘印', departmentIds: ['laser', 'tcm'] },
  { id: 'keloid', regionId: 'back', name: '疤痕疙瘩', departmentIds: ['laser'] },

  { id: 'buttockSkin', regionId: 'buttocks', name: '臀部色沉 / 皮肤粗糙', departmentIds: ['pigment', 'laser'] },

  { id: 'privateLax', regionId: 'privateFemale', name: '私密松弛', departmentIds: ['privateF'], sex: 'female' },
  { id: 'privateShapeF', regionId: 'privateFemale', name: '私密外形 / 色素不满意', departmentIds: ['privateF'], sex: 'female' },
  { id: 'privateShapeM', regionId: 'privateMale', name: '私密外形咨询(包皮等)', departmentIds: ['privateM'], sex: 'male' },

  { id: 'armScar', regionId: 'arm', name: '手臂疤痕', departmentIds: ['laser'] },
  { id: 'armSpots', regionId: 'arm', name: '手臂胎记 / 色斑', departmentIds: ['pigment'] },

  { id: 'handAging', regionId: 'hand', name: '手部色斑 / 老年斑', departmentIds: ['pigment'] },

  { id: 'spiderVeins', regionId: 'leg', name: '腿上红血丝 / 蜘蛛纹', departmentIds: ['vascular'] },
  { id: 'legScar', regionId: 'leg', name: '腿部疤痕', departmentIds: ['laser'] },
  { id: 'calf', regionId: 'leg', name: '小腿粗想瘦腿', departmentIds: ['botox'] },

  { id: 'nightOnly', regionId: WHOLE_BODY, name: '白天没空,只能晚上来', departmentIds: ['night'] },
  { id: 'notSure', regionId: WHOLE_BODY, name: '想整体咨询,不知道挂哪个', departmentIds: ['general'] },
  { id: 'tcmBody', regionId: WHOLE_BODY, name: '想中医调理体质 / 气色', departmentIds: ['tcm'] },
  { id: 'infection', regionId: WHOLE_BODY, name: '治疗后伤口红肿、发热、流脓', departmentIds: ['general'], redFlag: '可能是术后感染,需要尽快处理;发热或红肿扩散请立即到急诊' },
  { id: 'anaphylaxis', regionId: WHOLE_BODY, name: '治疗后呼吸困难、全身起疹', departmentIds: ['general'], redFlag: '可能是严重过敏反应,请立即拨打 120' },
]

const forSex = (sex: Sex) => (item: { sex?: Sex }) => item.sex === undefined || item.sex === sex

export function regionsFor(sex: Sex): BodyRegion[] {
  return regions.filter(forSex(sex))
}

export function symptomsOf(regionId: string, sex: Sex): Symptom[] {
  return symptoms.filter(s => s.regionId === regionId).filter(forSex(sex))
}

export const regionById = new Map(regions.map(r => [r.id, r]))
export const symptomById = new Map(symptoms.map(s => [s.id, s]))
