# 部位诉求表(医疗美容科)

> 3D 人脸上每个部位能选的诉求都从这个文件读,改完保存即生效。目前只做面部,身体部位暂不收。
> **只收知识库(`knowledge/*.md`)覆盖到的诉求**:诉求名用文档原词,括号里是俗称;文档里没有资料的不收。
> 每个部位至少要有一条诉求(测试会检查)。
>
> - 每个部位一个 `##` 标题,括号里是部位编号(与 3D 模型绑定,**别改**)。
> - 表格六列:编号 | 诉求 | 门诊 | 标签 | 性别 | 危急提示。
> - **编号**:英文,唯一,别改已有的。
> - **门诊**:`hospital.md` 里的门诊编号,多个用顿号隔开,第一个是首选。
> - **标签**:文档里的病名、项目名与常见别名,多个用顿号隔开。
> - **性别**:`女` / `男`,不限留空。
> - **危急提示**:填了就是危急诉求,选中立即提示急诊;普通诉求留空。

## 脸 (face)

> 脸在 3D 上分五块,「部位」列写这条诉求出现在哪几块:
> `forehead` 额头、`eye` 眼周(含眉)、`nose` 鼻部、`cheek` 脸颊、`mouth` 口周与下巴。
> 文档没写诉求长在哪,归属按常见发生部位分配。

| 编号 | 诉求 | 部位 | 门诊 | 标签 | 性别 | 危急提示 |
|---|---|---|---|---|---|---|
| freckles | 雀斑 / 雀斑样痣(小斑点) | nose、cheek | pigment | 雀斑、雀斑样痣、晒斑、皮秒激光、调Q激光、强脉冲光 |  |  |
| melasma | 黄褐斑(脸上成片的褐色斑) | forehead、cheek、mouth | pigment、tcm | 黄褐斑、黄褐斑中医特色治疗、皮秒激光、强脉冲光 |  |  |
| sebKeratosis | 脂溢性角化(老年斑) | forehead、eye、cheek | pigment | 脂溢性角化、老年斑 |  |  |
| birthmark | 咖啡斑 / 褐青色痣 / 太田痣(胎记类) | forehead、eye、cheek | pigment | 咖啡斑、褐青色痣、太田痣、调Q755激光 |  |  |
| mole | 色素痣(痣) | forehead、eye、nose、cheek、mouth | pigment、general | 色素痣、点痣、激光祛痣、手术切除、美容缝合 |  |  |
| telangiectasia | 毛细血管扩张 / 面部潮红(红血丝、脸红) | nose、cheek | vascular | 毛细血管扩张、面部潮红、强脉冲光、双波长脉冲染料激光 |  |  |
| vascularMark | 鲜红斑痣 / 血管瘤 | forehead、eye、cheek、mouth | vascular | 鲜红斑痣、血管瘤、双波长脉冲染料激光 |  |  |
| rosacea | 酒糟鼻(鼻头发红) | nose、cheek | vascular、tcm | 酒糟鼻、玫瑰痤疮、强脉冲光、双波长脉冲染料激光 |  |  |
| dermatitis | 面部皮炎 / 敏感肌肤(敏感肌) | forehead、eye、cheek、mouth | laser、vascular | 面部皮炎、敏感肌肤、黄极光 |  |  |
| acne | 粉刺 / 痤疮(长痘) | forehead、nose、cheek、mouth | general、tcm | 粉刺、痤疮、红蓝光、果酸、痤疮火针 |  |  |
| acneScar | 痤疮瘢痕(痘印、痘坑) | forehead、cheek | laser | 痤疮瘢痕、痘印、痘坑、CO2点阵激光、非剥脱点阵激光、黄金微针 |  |  |
| pores | 毛孔粗大 | forehead、nose、cheek | laser | 毛孔粗大、点阵激光、黄金微针、黄极光 |  |  |
| dullSkin | 皮肤粗糙 / 暗沉 / 泛黄(肤质差) | forehead、cheek | faceYouth | 光子嫩肤、强脉冲光、水光针、皮肤粗糙、暗沉、泛黄、细纹 |  |  |
| rejuvenation | 面部年轻化(皱纹、松弛) | forehead、eye、cheek、mouth | faceYouth、botox | 面部年轻化、面部抗衰老、热玛吉、超声炮、热拉提、黄金微针、高频点雕、水光注射、肉毒素注射 |  |  |
| faceFat | 面部脂肪堆积(脸胖、双下巴) | cheek、mouth | general | 面部脂肪堆积、美体塑型、面部高频溶脂(点雕) |  |  |
