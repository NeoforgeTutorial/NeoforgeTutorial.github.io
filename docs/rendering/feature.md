---
sidebar_position: 1
---
# 渲染特性 {#features}

渲染特性是一组不烘焙进世界几何体的对象，例如实体、文本和粒子。这些对象通常具有动态位置，因此下落或手持的方块和物品也属于这一类。渲染特性的用途，是更好地批量组织和排序要绘制到屏幕上的对象。渲染特性分为两个阶段：收集所有特性的提交阶段，以及绘制已收集特性的渲染阶段。

## 提交特性 {#submitting-features}

特性提交通常由负责相应对象的底层子系统处理，例如[实体使用 `EntityRenderer`][entities]、[方块实体使用 `BlockEntityRenderer`][blockentities]、[粒子使用 `ParticleGroupRenderState`][particles]等。每个子系统都提供自己的 `submit` 方法，通常接收对象的一些通用渲染状态，然后通过 `SubmitNodeCollector` 提交必要元素。这些元素会保存在用于渲染的 `SubmitNodeCollection` 树映射中。

收集器提供以下方法，下方顺序也是它们最终渲染的顺序：

| 方法 | 说明 |
|:----:|------|
| `submitShadow` | 按所需半径、位置和不透明度提交若干黑色椭圆。 |
| `submitNameTag` | 文本，按透明度排序。 |
| `submitText` | 文本。 |
| `submitFlame` | 应用于实体的火焰叠加层。 |
| `submitLeash` | 一个由 24 个分段组成的平面。 |
| `submitModel` | 带渲染状态的 `Model`，按透明度排序。 |
| `submitModelPart` | `ModelPart`。 |
| `submitMovingBlock` | 一组带动态光照的 `BlockStateModelPart`。 |
| `submitBlockModel` | 带烘焙光照的 `BlockStateModel`。 |
| `submitBreakingBlockModel` | 绘制在 `BlockStateModel` 上方的裂纹叠加层。 |
| `submitItem` | 拆分表示的 `ItemStackRenderState`。 |
| `submitCustomGeometry` | 由任意方法定义顶点，并上传到指定 `RenderType` 的缓冲区。 |
| `submitParticleGroup` | 用于缓存并批量写入一组粒子四边形的渲染器。 |

NeoForge 还添加了 `submitMultiLayerBlockModel`，用于提交一组 `BlockStateModelPart`，并完整支持每个四边形使用不同的渲染类型，而不是把所有四边形都推入同一个类型层。

:::warning
调用提交方法后，应把这些元素视为不可变。某些元素（例如 `PoseStack`）会在调用时创建快照，避免之后继续修改。
:::

从技术上说，以上所有方法都属于父接口 `OrderedSubmitNodeCollector`。收集器可以把特性分到不同的“顺序”中，每个顺序表示渲染器的一次绘制过程。默认情况下，所有特性都在顺序 0 中渲染，也就是按下文规定的渲染顺序绘制。数字更小的顺序会更早渲染，数字更大的顺序会更晚渲染。可以使用 `SubmitNodeCollector#order` 指定元素的绘制顺序：

```java
// 假设已有 SubmitNodeCollector collector

// 以下内容会在顺序 0 中渲染。
collector.submitModel(...);

// 以下内容会在模型之前渲染。
collector.order(-1).submitBlockModel(...);

// 以下内容会在模型之后渲染。
collector.order(1).submitParticleGroup(...);
```

## 渲染特性 {#rendering-features}

特性渲染通过 `FeatureRenderDispatcher` 的 `renderAllFeatures` 处理。该方法会渲染保存在 `SubmitNodeStorage` 中的已提交对象，而 `SubmitNodeStorage` 持有 `SubmitNodeCollection` 树映射。分派器包含一组渲染器类，每类负责渲染一种已提交对象。整个渲染顺序分为两个阶段：渲染不透明特性，以及渲染透明几何体。

对于不透明特性，在同一个“顺序”内，会按以下顺序渲染：

- 模型
- 模型部件
- 实体火焰叠加层
- 拴绳
- 物品
- 移动的方块
- 方块模型
- NeoForge 的多层方块模型
- 自定义几何体
- 粒子

对于透明特性，在同一个“顺序”内，会按以下顺序渲染：

- 阴影
- 模型
- 模型部件
- 名称标签
- 文本
- 物品
- 移动的方块
- 方块模型
- NeoForge 的多层方块模型
- 自定义几何体

所有透明特性渲染完成后，会单独再渲染一次透明粒子。

特性渲染完毕后，`SubmitNodeStorage` 会被清空，以供下次使用。特性渲染器可能在一帧内被多次调用，因为它不仅用于世界，也用于手持物品和[画中画 GUI 渲染器][gui]。在这些情况下，`renderAllFeatures` 之后会调用 `MultiBufferSource.BufferSource#endBatch` 构建网格，再把网格绘制到缓冲区。

[blockentities]: ../blockentities/ber.md
[entities]: ../entities/renderer.md
[gui]: screens.md#picture-in-picture
[particles]: particles.md#particle-groups-and-render-states
