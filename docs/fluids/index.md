---
description: 如何添加自定义流体。
sidebar_position: 1
---
# 流体

在原版 Minecraft 中，水和岩浆这两种流体是特殊的[方块][block]，可以在一定距离内向相邻方块蔓延。它们通常不是固体，[实体][entity]可以进入其中并“游泳”。

在模组化 Minecraft 中，尤其是许多科技模组里，流体还会用作配方原料。这是因为流体位于独立注册表中，只在世界中通过流体方块出现。因此，流体可以完全独立于方块看待。

本文介绍如何添加自己的流体。关于流体系统在世界中的部分，请参阅[世界中的流体][inworld]；关于在配方中使用流体，请参阅[配方中的流体][recipes]。

:::warning
由于原版只有两种流体，而且它们包含大量特殊处理，本节涉及的一些系统实现较为取巧。由于存在许多无法在测试中合理覆盖的边界情况，这些系统不一定总能正确工作。如果发现流体相关 Bug，请在 [Discord][discord] 联系我们，或在 [GitHub][github] 提交 issue。
:::

## `Fluid` 与 `FluidType` {#fluid-and-fluidtype}

注册流体之前，需要先理解 Minecraft 和 NeoForge 做出的一些设计选择。

Minecraft 中的水和岩浆各有两个变体：流动流体和源流体。这种设计主要来自硬编码，并与下文介绍的 `FluidState` 有一定关联。由于这些硬编码至少可以说很不方便，最坏情况下甚至无法使用，NeoForge 引入了 `FluidType` 类，并修改了大量相关位置来使用它。`FluidType` 的主要用途是保存流体的通用逻辑，例如播放的声音、能否使用船等，只把实际的流动逻辑留给流体本身。`FluidType` 位于 NeoForge 添加的独立注册表中，因此除了 `Fluid`，还必须注册 `FluidType`。

下面以熔融铁流体为例。首先需要两个[注册表][registries]：

```java
public static final DeferredRegister<Fluid> FLUIDS =
        DeferredRegister.create(Registries.FLUID, ExampleMod.MOD_ID);
public static final DeferredRegister<FluidType> FLUID_TYPES =
        DeferredRegister.create(NeoForgeRegistries.FLUID_TYPES, ExampleMod.MOD_ID);
```

由于创建 `Fluid` 需要 `FluidType`，应先创建 `FluidType`。`FluidType` 的选项由 `Properties` 对象定义，类似方块属性：

```java
public static final DeferredHolder<FluidType, FluidType> MOLTEN_IRON_TYPE = FLUID_TYPES.register(
        // 流体类型的注册名。通常与 `Fluid` 使用相同名称。
        "molten_iron",
        // 流体类型工厂，接收 `FluidType.Properties` 对象。
        id -> new FluidType(FluidType.Properties.create()
                // 流体的翻译键。它在原版 Minecraft 中不可见，
                // 但在流体存入模组储罐等容器时可见，
                // 安装 WAILA（What Am I Looking At?）等模组后也可在查看世界中的流体时看到。
                // `id` 是 lambda 接收的参数。
                .descriptionId(Util.makeDescriptionId("fluid", id))
                // 为流体设置类似岩浆的声音。只有拥有桶物品时才相关，后文会介绍。
                .sound(SoundActions.BUCKET_FILL, SoundEvents.BUCKET_FILL_LAVA)
                .sound(SoundActions.BUCKET_EMPTY, SoundEvents.BUCKET_EMPTY_LAVA)
                // 不能熔融铁中游泳或溺水。
                .canDrown(false)
                .canSwim(false)
                // 让熔融铁略微发光。
                .lightLevel(5)
        ));
```

:::tip
`FluidType` 还提供许多其他方法。例如，制作更接近水的流体时，可以关注 `supportsBoating()` 和 `isWaterLike()`。完整方法列表请查看 `FluidType.Properties` 源码。

并非所有方法都会被原版系统使用。其中有些方法（例如 `temperature()` 和 `density()`）是设计 `FluidType` 系统时为模组兼容性预留的，模组系统可能会使用，也可能不会使用。
:::

创建 `FluidType` 后，就可以处理 `Fluid` 本身。NeoForge 提供 `BaseFlowingFluid` 作为基类，其中包含三个内部类：`Source`、`Flowing` 和 `Properties`。`Source` 与 `Flowing` 都是 `BaseFlowingFluid` 的子类，布局类似原版的 `WaterFluid` 和 `LavaFluid`；`Properties` 同样类似方块属性，负责关联流体类型、源流体、流动流体，以及之后的桶和流体方块。

源流体和流动流体会依赖流体属性，而流体属性又依赖这两种流体，因此需要留意静态初始化顺序，并在某些位置用类名限定访问。假设流体都放在名为 `ModFluids` 的类中，代码应如下所示：

```java
// 源流体。名称通常不需要包含 "source"。
public static final DeferredHolder<Fluid, BaseFlowingFluid.Source> MOLTEN_IRON = FLUIDS.register(
        // 注册名。
        "molten_iron",
        // 源流体供应器。这里用类名限定属性。
        () -> new BaseFlowingFluid.Source(ModFluids.MOLTEN_IRON_PROPERTIES));

// 流动流体。名称通常以 "flowing_" 为前缀。
public static final DeferredHolder<Fluid, BaseFlowingFluid.Flowing> FLOWING_MOLTEN_IRON = FLUIDS.register(
        // 注册名。
        "flowing_molten_iron",
        // 流动流体供应器。同样用类名限定属性。
        () -> new BaseFlowingFluid.Flowing(ModFluids.MOLTEN_IRON_PROPERTIES));

// 流体属性。之后会用它们把桶等额外内容关联到流体。
public static final BaseFlowingFluid.Properties MOLTEN_IRON_PROPERTIES =
        // 参数依次为流体类型、源流体和流动流体。
        new BaseFlowingFluid.Properties(MOLTEN_IRON_TYPE, MOLTEN_IRON, FLOWING_MOLTEN_IRON);
```

完成后，流体就会加载到游戏中，配方也能够使用它。不过渲染仍会出错。要修复渲染，需要在[仅客户端][sides]的[模组事件总线][modbus][事件处理器][events]中注册流体模型：

```java
@SubscribeEvent // 仅在物理客户端上于模组事件总线触发
private static void registerFluidModels(RegisterFluidModelsEvent event) {
    event.register(new FluidModel.Unbaked(
            // 静止、流动和叠加纹理材质。叠加材质可以为 null；
            // 为 null 时不显示叠加层。叠加层只用于世界中的流体，
            // 因此没有世界中的流体时，这里应始终为 null。
            new Material(Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "block/molten_iron_still")),
            new Material(Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "block/molten_iron_flowing")),
            new Material(Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "block/molten_iron_overlay")),
            // 流体着色源。这里设为 null，表示不使用着色。详见下文。
            null,
            // 流体渲染器，可用于完全自定义流体渲染。
            // 此参数可选，省略时默认为 null。
            null),
            // 静止流体和流动流体的供应器。
            ModFluids.MOLTEN_IRON,
            ModFluids.FLOWING_MOLTEN_IRON
    );
}
```

## 资源 {#resources}

流体已经存在，但还需要添加资源文件，包括纹理、模型和翻译。

先添加纹理文件。制作资源时，建议以原版水或岩浆纹理为基础；流动流体尤其如此，因为流动流体渲染器实际采样的是类似 2×2 的纹理。纹理文件必须按以下方式命名和放置，其中 `examplemod` 是模组 ID：

- `assets/examplemod/textures/block/molten_iron_still.png`：静止纹理；
- `assets/examplemod/textures/block/molten_iron_flowing.png`：流动纹理；
- `assets/examplemod/textures/block/molten_iron_overlay.png`：叠加纹理（如适用）。

:::warning
这些路径要与传给 `RegisterFluidModelsEvent#register()` 的路径一致。也可以把文件放在其他位置，但还需要同步调整渲染器中的路径。

流体纹理会放入方块图集，因此应放在 `textures/block` 目录中。
:::

大多数流体都有动画，因此还需要配套的 `.png.mcmeta` 文件，同样可以以原版文件为基础。更多信息请参阅[纹理][textures]文章。

最后是翻译。流体使用的翻译键由 `FluidType#descriptionId()` 定义，可以通过 `#getDescriptionId()` 从 `FluidType` 取得：

```java
// 在 LanguageProvider 中
@Override
protected void addTranslations() {
    add(ModFluids.MOLTEN_IRON_TYPE.getDescriptionId(), "Molten Iron");
}
```

更多信息请参阅[国际化与本地化/数据生成][i18n]。

## 流体着色源 {#fluid-tint-sources}

_另见：[着色][tinting]。_

与方块一样，流体也可以着色。原版中水会着色，岩浆则不会。NeoForge 修改了该系统以支持模组。所有相关逻辑都通过 `FluidTintSource` 接口处理。在简单实现中，只需重写 `#color()`：

```java
// 如果可能，应使用单例。
public final class MoltenIronTintSource implements FluidTintSource {
    public static final MoltenIronTintSource INSTANCE = new MoltenIronTintSource();
    
    private MoltenIronTintSource() {}

    @Override
    public int color(FluidState state) {
        // 返回所需颜色。值为 ARGB；务必包含正确的 alpha 值，
        // 否则渲染结果会不可见。
        return 0xff000000;
    }
}
```

创建着色源后，在 `RegisterFluidModelsEvent` 中使用它：

```java
@SubscribeEvent // 仅在物理客户端上于模组事件总线触发
private static void registerFluidModels(RegisterFluidModelsEvent event) {
    event.register(new FluidModel.Unbaked(
            new Material(Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "block/molten_iron_still")),
            new Material(Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "block/molten_iron_flowing")),
            new Material(Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "block/molten_iron_overlay")),
            // 在这里使用着色源实例。
            MoltenIronTintSource.INSTANCE),
            ModFluids.MOLTEN_IRON,
            ModFluids.FLOWING_MOLTEN_IRON
    );
}
```

:::tip
如果实现只重写 `#color(FluidState)`，也可以使用函数式接口 lambda，而不必创建单例类。
:::

对于更复杂的行为，还提供两个方法，它们默认都调用 `#color(FluidState)`：

- `colorInWorld(FluidState fluidState, BlockState blockState, BlockAndTintGetter level, BlockPos pos)`：在世界中显示流体时使用的按位置着色方法。水用它实现随生物群系变化的颜色。
- `colorAsStack(FluidStack stack)`：根据 `FluidStack` 着色的方法，可用于依赖[数据组件][datacomponent]的着色。原版未使用它，因为 `FluidStack` 是 NeoForge 系统。

此外，`FluidTintSource` 继承 `BlockTintSource`，因此所有与 `BlockState` 相关的着色方法也可以使用。

[block]: ../blocks/index.md
[datacomponent]: ../items/datacomponents.md
[discord]: https://discord.neoforged.net/
[entity]: ../entities/index.md
[events]: ../concepts/events.md
[github]: https://github.com/neoforged/NeoForge/issues
[i18n]: ../resources/client/i18n.md#datagen
[inworld]: inworld.md
[modbus]: ../concepts/events.md#event-buses
[recipes]: recipes.md
[registries]: ../concepts/registries.md
[sides]: ../concepts/sides.md
[textures]: ../resources/client/textures.md
[tinting]: ../resources/client/models/index.md#tinting
