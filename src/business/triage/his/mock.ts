import type { HisDept, HisUser } from './his.ts'

// HIS_MODE=mock 的假数据:字段形状照接口文档(大写字段、SFYX 1/0),内容是编的,只为内网不通时能开发。
// 故意混进无效科室、病区、非医生人员,检验过滤逻辑。
export const MOCK_HIS: { depts: HisDept[], users: HisUser[] } = {
  depts: [
    { KSID: '0101', KSMC: '医疗美容科门诊', SJKSID: '01', SFYX: 1, MZ_FLAG: 1, ZY_FLAG: 0, JZ_FLAG: 0, BQ_FLAG: 0 },
    { KSID: '0102', KSMC: '皮肤科门诊', SJKSID: '01', SFYX: 1, MZ_FLAG: 1, ZY_FLAG: 0, JZ_FLAG: 0, BQ_FLAG: 0 },
    { KSID: '0103', KSMC: '整形外科门诊', SJKSID: '01', SFYX: 1, MZ_FLAG: 1, ZY_FLAG: 0, JZ_FLAG: 0, BQ_FLAG: 0 },
    { KSID: '0104', KSMC: '中医科门诊', SJKSID: '01', SFYX: 1, MZ_FLAG: 1, ZY_FLAG: 0, JZ_FLAG: 0, BQ_FLAG: 0 },
    { KSID: '0201', KSMC: '整形外科病区', SJKSID: '02', SFYX: 1, MZ_FLAG: 0, ZY_FLAG: 1, JZ_FLAG: 0, BQ_FLAG: 1 },
    { KSID: '0199', KSMC: '激光美容门诊(已撤销)', SJKSID: '01', SFYX: 0, MZ_FLAG: 1, ZY_FLAG: 0, JZ_FLAG: 0, BQ_FLAG: 0 },
  ],
  users: [
    { RYID: 'U001', ZH: 'mock001', GH: 'MR001', XM: '张医生', RYLB: '01', SFYX: 1 },
    { RYID: 'U002', ZH: 'mock002', GH: 'MR002', XM: '李医生', RYLB: '01', SFYX: 1 },
    { RYID: 'U003', ZH: 'mock003', GH: 'HL001', XM: '王护士', RYLB: '02', SFYX: 1 },
    { RYID: 'U004', ZH: 'mock004', GH: 'MR009', XM: '赵医生', RYLB: '01', SFYX: 0 },
  ],
}
