---
description: 如何在世界中添加和使用流体。
sidebar_position: 2
---

import GitHubImageDisplay from "@site/src/tsx/GitHubImageDisplay.tsx";

# 世界中的流体 {#in-world-fluids}

把[流体][fluid]放入世界时，使用的是 `FluidState`，而不是 `Fluid`；这类似[`BlockState`][blockstate]与[`Block`][block]的关系。与 `BlockState` 一样，可以调用 `Level#getFluidState()` 查询某个位置的流体状态，也可以使用 `Fluid#defaultFluidState()` 取得默认状态。

不过，`FluidState` 与 `BlockState` 也有一些差异。最明显的是，不同的流体状态并不通过属性区分，至少不是像方块状态属性那样定义；具体 `FluidState` 由世界根据流体蔓延机制计算。大多数情况下无需关心具体状态，只在需要时查询 `isSource()` 等属性即可。

遗憾的是，目前世界中的 `FluidState` 实现相当不完整。更遗憾的是，要在不破坏原版世界兼容性的前提下修复它，对 NeoForge 来说几乎不可能。基本上所有 `FluidState` 逻辑都以某种方式与 `BlockState` 绑定，即使并没有这种必要。这也是没有 `Level#setFluidState()` 方法的原因之一。在现实现中，`Level#getFluidState()` 基本上最终会调用 `BlockState#getFluidState()`，而且发生在区块存储的很深层。预计 Mojang 最终会重做这部分，但目前只能暂时接受这一限制。

## 含水化 {#waterlogging}

_另见[方块][block]和[方块状态][blockstate]。_

`FluidState` 系统不完整的典型例子就是含水化。某些非完整方块（例如台阶）可以同时包含一个水源，这称为含水（waterlogging）。目前通过 `WATERLOGGED` 方块状态属性实现：

```java
// 实现 SimpleWaterloggedBlock 会自动允许用桶取水，并提供一些辅助方法。
public class MyBlock extends Block implements SimpleWaterloggedBlock {
    // 为便于访问，把 WATERLOGGED 属性加入类中。
    public static final BooleanProperty WATERLOGGED = BlockStateProperties.WATERLOGGED;

    // 默认把 WATERLOGGED 设为 false。
    public MyBlock(Properties properties) {
        super(properties);
        registerDefaultState(getStateDefinition().any().setValue(WATERLOGGED, false));
    }

    // 把 WATERLOGGED 加入方块状态定义。
    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        super.createBlockStateDefinition(builder);
        builder.add(WATERLOGGED);
    }

    // 关键部分：查询流体状态时读取 WATERLOGGED 属性。
    // Fluids.WATER.getSource(false) 中的 `false` 表示“下落”，
    // 原版所有含水实现都传入 false。
    @Override
    public FluidState getFluidState(BlockState state) {
        return state.getValue(WATERLOGGED) ? Fluids.WATER.getSource(false) : super.getFluidState(state);
    }

    // 在水中放置该方块时，使用含水状态。
    @Override
    public BlockState getStateForPlacement(BlockPlaceContext context) {
        return defaultBlockState().setValue(
                WATERLOGGED,
                context.getLevel().getFluidState(context.getClickedPos()).is(Fluids.WATER)
        );
    }
    
    // 方块更新时（例如相邻方块改变），应安排一次 tick。
    @Override
    protected BlockState updateShape(
            BlockState state,
            LevelReader level,
            ScheduledTickAccess ticks,
            BlockPos pos,
            Direction directionToNeighbour,
            BlockPos neighbourPos,
            BlockState neighbourState,
            RandomSource random
    ) {
        if (state.getValue(WATERLOGGED)) {
            ticks.scheduleTick(pos, Fluids.WATER, Fluids.WATER.getTickDelay(level));
        }
        return super.updateShape(state,
                level,
                ticks,
                pos,
                directionToNeighbour,
                neighbourPos,
                neighbourState,
                random);
    }
}
```

:::info
实现“岩浆化”或其他流体的含水效果并不困难：创建新的 `BooleanProperty`，像平常一样加入方块，并让 `Block#getFluidState()` 在属性为 true 时返回所需流体即可。

不过需要注意，含水化在某些位置仍然硬编码，例如世界生成或活塞移动逻辑。
:::

## 流体方块 {#fluid-blocks}

要让流体能够放置到世界中，需要为它创建 `LiquidBlock`：

```java
// 假设已有名为 BLOCKS 的 DeferredRegister.Blocks，
// 并假设流体相关内容位于名为 ModFluids 的另一个类中。
public static final DeferredBlock<LiquidBlock> MOLTEN_IRON = BLOCKS.registerBlock(
        // 方块注册名。
        "molten_iron",
        // 流体方块工厂。
        properties -> new LiquidBlock(ModFluids.MOLTEN_IRON.get(), properties),
        // 方块属性。
        () -> BlockBehaviour.Properties.of()
                // 原版两种流体使用的标准属性。强度 100 可让原版 TNT
                // 不对该方块造成效果，同时允许模组爆炸物继续生效。
                .liquid()
                .noLootTable()
                .noCollision()
                .replaceable()
                .pushReaction(PushReaction.DESTROY)
                .sound(SoundType.EMPTY)
                .strength(100)
                // 可以根据流体行为定义其他属性。
                // 例如像之前一样，让熔融铁方块略微发光：
                .lightLevel(_ -> 5)
);
```

然后应把方块加入流体属性：

```java
public static final BaseFlowingFluid.Properties MOLTEN_IRON_PROPERTIES =
        new BaseFlowingFluid.Properties(MOLTEN_IRON_TYPE, MOLTEN_IRON, FLOWING_MOLTEN_IRON)
                // 设置方块，假设它位于 `ModBlocks` 类中。
                // 确保 `ModBlocks` 在 `ModFluids` 之前完成类加载！
                .block(ModBlocks.MOLTEN_IRON);
```

最后，方块还需要模型，这可以通过[数据生成][models]轻松完成：

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.createNonTemplateModelBlock(ModBlocks.MOLTEN_IRON.get());
}
```

## 桶 {#buckets}

流体通常可以用桶拾取。可以这样为自定义流体添加桶：

```java
// 假设已有名为 ITEMS 的 DeferredRegister.Items，
// 并假设流体相关内容位于名为 ModFluids 的另一个类中。
public static final DeferredItem<BucketItem> MOLTEN_IRON_BUCKET = ITEMS.registerItem(
        // 注册名。
        "molten_iron_bucket",
        // 桶物品工厂。
        properties -> new BucketItem(ModFluids.MOLTEN_IRON.get(), properties),
        // 属性供应器。桶只能堆叠到 1，并在合成后返还空桶。
        () -> new Item.Properties().stacksTo(1).craftRemainder(Items.BUCKET)
);
```

然后把桶加入流体属性：

```java
public static final BaseFlowingFluid.Properties MOLTEN_IRON_PROPERTIES =
        new BaseFlowingFluid.Properties(MOLTEN_IRON_TYPE, MOLTEN_IRON, FLOWING_MOLTEN_IRON)
                .block(ModBlocks.MOLTEN_IRON)
                // 设置桶，假设它位于 `ModItems` 类中。
                // 确保 `ModItems` 在 `ModFluids` 之前完成类加载！
                .bucket(ModItems.MOLTEN_IRON_BUCKET);
```

接下来建议为桶添加发射器行为，不过并非必需：

```java
@SubscribeEvent // 在模组事件总线上
private static void commonSetup(FMLCommonSetupEvent event) {
    // `DispenserBlock#registerBehavior` 并非线程安全，因此放入 lambda 中执行。
    event.enqueueWork(() -> DispenserBlock.registerBehavior(ModItems.MOLTEN_IRON_BUCKET, DispenseFluidContainer.getInstance()));
}
```

:::tip
如果桶需要自定义发射器行为，可以创建自己的 `DispenseItemBehavior`。可参考 `DispenseFluidContainer` 的实现。
:::

最后只剩下翻译和模型：

```java
// 在语言提供器中
@Override
protected void addTranslations() {
    add(ModFluids.MOLTEN_IRON_TYPE.get().getDescriptionId(), "Molten Iron");
    addItem(ModItems.MOLTEN_IRON_BUCKET, "Molten Iron Bucket");
}

// 在模型提供器中
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.createNonTemplateModelBlock(ModBlocks.MOLTEN_IRON.get());
    // 使用 NeoForge 的 `DynamicFluidContainerModel`。
    itemModels.itemModelOutput.accept(ModItems.MOLTEN_IRON_BUCKET.get(), new DynamicFluidContainerModel.Unbaked(
            // 模型纹理。模型按桶底、流体、覆盖层的顺序渲染（从最低到最高）。
            new DynamicFluidContainerModel.Textures(
                    // 粒子纹理。
                    Optional.of(new Material(Identifier.withDefaultNamespace("item/bucket"))),
                    // 桶底纹理。
                    Optional.of(new Material(Identifier.withDefaultNamespace("item/bucket"))),
                    // 流体纹理，也就是实际容纳流体的部分。
                    Optional.of(new Material(Identifier.fromNamespaceAndPath("neoforge", "item/mask/bucket_fluid"))),
                    // 覆盖纹理。最后渲染，可以使用遮罩（见下文）。
                    Optional.empty()
            ),
            // 要使用的流体。
            ModFluids.MOLTEN_IRON.get(),
            // 是否翻转桶模型，常用于“气态”流体。
            false,
            // 为 true 时把覆盖纹理作为遮罩；为 false 时正常渲染。详见下文。
            true,
            // 为 true 时，如果流体发光，模型中的流体部分也会使用自发光。
            true));
}
```

### 桶遮罩纹理 {#bucket-mask-textures}

如果 `coverIsMask` 为 `true`，覆盖纹理会作为遮罩纹理处理。NeoForge 为桶提供四种默认遮罩纹理。遮罩纹理的每个位置要么是完全透明像素（这里用纯黑显示，以便与网站背景区分），要么不是完全透明像素，相当于一种模板。下面的图片最能说明它们的作用：

<div class="display-image-container">
    <GitHubImageDisplay repository="neoforged/NeoForge" branch="26.1.x" path="src/main/resources/assets/neoforge/textures/item/mask/bucket_fluid.png" clazz="texture-16" caption="桶流体遮罩" captionHint="assets/neoforge/textures/item/mask/bucket_fluid.png" width="200"/>
    <GitHubImageDisplay repository="neoforged/NeoForge" branch="26.1.x" path="src/main/resources/assets/neoforge/textures/item/mask/bucket_fluid_drip.png" clazz="texture-16" caption="桶流体滴落遮罩" captionHint="assets/neoforge/textures/item/mask/bucket_fluid_drip.png" width="200"/>
    <GitHubImageDisplay repository="neoforged/NeoForge" branch="26.1.x" path="src/main/resources/assets/neoforge/textures/item/mask/bucket_fluid_cover.png" clazz="texture-16" caption="桶流体覆盖遮罩" captionHint="assets/neoforge/textures/item/mask/bucket_fluid_cover.png" width="200"/>
    <GitHubImageDisplay repository="neoforged/NeoForge" branch="26.1.x" path="src/main/resources/assets/neoforge/textures/item/mask/bucket_fluid_cover_drip.png" clazz="texture-16" caption="桶流体覆盖滴落遮罩" captionHint="assets/neoforge/textures/item/mask/bucket_fluid_cover_drip.png" width="200"/>
</div>

只有遮罩中不是完全透明的像素会参与渲染；与遮罩完全透明部分重叠的像素会被丢弃。

:::tip
为便于区分两类像素，建议遵循透明像素使用透明黑（`0x00000000`），非透明像素使用纯白（`0xffffffff`）的规则。
:::

## 炼药锅 {#cauldrons}

除了桶，流体通常还需要能装入炼药锅。为此需要单独的炼药锅方块：

```java
public class MoltenIronCauldronBlock extends AbstractCauldronBlock {
    // 方块 codec 样板代码。
    private static final MapCodec<MoltenIronCauldronBlock> CODEC =
            simpleCodec(MoltenIronCauldronBlock::new);

    @Override
    protected MapCodec<? extends AbstractCauldronBlock> codec() {
        return CODEC;
    }

    // 炼药锅交互分派器及其 ID。详见下文。
    public static final CauldronInteraction.Dispatcher CAULDRON_INTERACTIONS =
            new CauldronInteraction.Dispatcher();
    public static final Identifier CAULDRON_INTERACTIONS_ID =
            Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "molten_iron_cauldron");

    // 把 `CauldronInteraction.Dispatcher` 传给父类。
    public MoltenIronCauldronBlock(Properties properties) {
        super(properties, CAULDRON_INTERACTIONS);
    }

    // 假设炼药锅只有完全装满状态，
    // 也就是没有“瓶子”等中间计量单位。
    @Override
    public boolean isFull(BlockState state) {
        return true;
    }

    // 原版水炼药锅根据液面高度输出 1 到 3，
    // 我们的炼药锅始终是满的，因此输出 3。
    @Override
    protected int getAnalogOutputSignal(BlockState state, Level level, BlockPos pos, Direction direction) {
        return 3;
    }

    // 满炼药锅的视觉高度为 0.9375（即 15/16）。
    @Override
    protected double getContentHeight(BlockState state) {
        return 0.9375;
    }
}
```

然后在注册时使用该炼药锅：

```java
// 假设已有名为 BLOCKS 的 DeferredRegister.Blocks。
public static final DeferredBlock<MoltenIronCauldronBlock> MOLTEN_IRON_CAULDRON = BLOCKS.registerBlock(
        // 注册名。
        "molten_iron_cauldron",
        // 炼药锅构造函数引用。
        MoltenIronCauldronBlock::new,
        // 使用的属性。通常直接复制原版炼药锅。
        // 因为熔融铁会发光，这里也为炼药锅应用发光效果。
        () -> BlockBehaviour.Properties.ofFullCopy(Blocks.CAULDRON).lightLevel(_ -> 5)
);
```

接下来需要把流体与炼药锅关联起来。在 `RegisterCauldronFluidContentEvent` 中完成：

```java
@SubscribeEvent // 在模组事件总线上
private static void registerCauldronFluidContent(RegisterCauldronFluidContentEvent event) {
    event.register(
            // 炼药锅方块。
            ModBlocks.MOLTEN_IRON_CAULDRON.get(),
            // 流体。
            ModFluids.MOLTEN_IRON.get(),
            // 数量。
            FluidType.BUCKET_VOLUME,
            // 表示液面高度的方块状态属性。这里没有该属性，因此传入 null。
            null);
}
```

最后，流体炼药锅仍然是普通方块，因此还需要数据生成设置，包括[翻译][i18n]、[方块模型][models]、[战利品表][loottable]和[标签][tags]：

```java
// 在语言提供器中
@Override
protected void addTranslations() {
    add(ModFluids.MOLTEN_IRON_TYPE.get().getDescriptionId(), "Molten Iron");
    addItem(ModItems.MOLTEN_IRON_BUCKET, "Molten Iron Bucket");
    addBlock(ModBlocks.MOLTEN_IRON_CAULDRON, "Molten Iron Cauldron");
}

// 在模型提供器中
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.createNonTemplateModelBlock(ModBlocks.MOLTEN_IRON.get());
    itemModels.itemModelOutput.accept(...);
    blockModels.blockStateOutput.accept(BlockModelGenerators.createSimpleBlock(
            // 我们的炼药锅方块。
            ModBlocks.MOLTEN_IRON_CAULDRON.get(),
            // 使用 `CAULDRON_FULL` 模型模板。
            BlockModelGenerators.plainVariant(ModelTemplates.CAULDRON_FULL.create(
                    // 我们的炼药锅方块。
                    ModBlocks.MOLTEN_IRON_CAULDRON.get(),
                    // 炼药锅流体纹理映射。
                    TextureMapping.cauldron(TextureMapping.getBlockTexture(ModBlocks.MOLTEN_IRON.get(), "_still")),
                    blockModels.modelOutput))));
}

// 在方块战利品子提供器中
@Override
protected void generate() {
    // 被破坏时掉落空炼药锅。
    dropOther(ModBlocks.MOLTEN_IRON_CAULDRON.get(), Items.CAULDRON);
}

// 在方块标签提供器中
@Override
protected void addTags(HolderLookup.Provider provider) {
    tag(BlockTags.CAULDRONS).add(ModBlocks.MOLTEN_IRON_CAULDRON.get());
}
```

### 炼药锅交互 {#cauldron-interactions}

炼药锅现在已经存在，但还不能交互，也无法在生存模式中获得。要让它正常工作，需要注册炼药锅交互。回看炼药锅类，其中已有 `CauldronInteraction.Dispatcher`，下面会用到它。

炼药锅交互涉及两个事件。首先注册 `CauldronInteraction.Dispatcher`：

```java
@SubscribeEvent // 在模组事件总线上
private static void registerCauldronInteractionDispatchers(RegisterCauldronInteractionEvent.Dispatcher event) {
    event.register(
            // 唯一标识符。
            MoltenIronCauldronBlock.CAULDRON_INTERACTIONS_ID,
            // 我们的 `CauldronInteraction.Dispatcher`。
            MoltenIronCauldronBlock.CAULDRON_INTERACTIONS);
}
```

其次，注册实际交互：

```java
@SubscribeEvent
private static void registerCauldronInteractions(RegisterCauldronInteractionEvent.Interaction event) {
    // 手持空桶右键时，从炼药锅中取出流体。
    event.register(
            // 炼药锅交互 ID。
            MoltenIronCauldronBlock.CAULDRON_INTERACTIONS_ID,
            // 右键时使用的物品。
            Items.BUCKET,
            // 右键时调用的回调。输入参数为炼药锅方块状态、世界、
            // 位置、玩家、使用的手和使用的物品堆。
            (state, level, pos, player, hand, stack) -> CauldronInteractions.fillBucket(
                    // 传递输入参数。
                    state, level, pos, player, hand, stack,
                    // 生成的物品堆。
                    ModItems.MOLTEN_IRON_BUCKET.toStack(),
                    // 判断桶能否装满的额外检查谓词。
                    // 这里没有额外检查，因此始终返回 true。
                    _ -> true,
                    // 从炼药锅中取出流体时播放的声音事件。
                    SoundEvents.BUCKET_FILL_LAVA));
    
    // 为兼容原版，需要处理手持水桶、岩浆桶和细雪桶
    // 右键该炼药锅的情况。与其他模组的兼容性由桶装填处理器
    // 方法处理，见下文。
    event.register(
            MoltenIronCauldronBlock.CAULDRON_INTERACTIONS_ID,
            Items.LAVA_BUCKET,
            CauldronInteractions::fillLavaInteraction);
    event.register(
            MoltenIronCauldronBlock.CAULDRON_INTERACTIONS_ID,
            Items.WATER_BUCKET,
            CauldronInteractions::fillWaterInteraction);
    event.register(
            MoltenIronCauldronBlock.CAULDRON_INTERACTIONS_ID,
            Items.POWDER_SNOW_BUCKET,
            CauldronInteractions::fillPowderSnowInteraction);

    // 手持我们的桶右键**任意**炼药锅时，把它替换为我们的炼药锅。
    // 为此使用 `event#registerToAll()`，而不是 `event#register()`。
    event.registerToAll(ModItems.MOLTEN_IRON_BUCKET.get(),
            // 右键时调用的回调。输入参数为炼药锅方块状态、世界、
            // 位置、玩家、使用的手和使用的物品堆。
            (state, level, pos, player, hand, stack) -> CauldronInteractions.emptyBucket(
                    // 传递除 state 外的输入参数。
                    level, pos, player, hand, stack,
                    // 生成的方块状态。
                    ModBlocks.MOLTEN_IRON_CAULDRON.get().defaultBlockState(),
                    // 向炼药锅中倒入流体时播放的声音事件。
                    SoundEvents.BUCKET_EMPTY_LAVA));
}
```

炼药锅交互并不限于桶。原版还添加了一些其他炼药锅配方，主要用于“清洗”染色物品，其工作方式大体相同。更多信息请查看 `CauldronInteractions` 类，原版炼药锅交互分派器也位于该类中。

### 滴水石滴水 {#dripstone-dripping}

使用滴水石和炼药锅的组合，可以让水和岩浆变为可再生资源。也可以通过 `FluidType.Properties` 的 `addDripstoneDripping()` 为模组炼药锅扩展这一功能：

```java
FluidType.Properties.create()
        .addDripstoneDripping(
                // 每次尝试填满炼药锅的概率。原版值位于
                // PointedDripstoneBlock.WATER_TRANSFER_PROBABILITY_PER_RANDOM_TICK
                // 和 PointedDripstoneBlock.LAVA_TRANSFER_PROBABILITY_PER_RANDOM_TICK，
                // 分别约为 17.5% 和 5.9%。水需要填满三个液面层级，
                // 因此出现滴落的概率是岩浆的三倍；岩浆炼药锅则一次装满。
                // 熔融铁遵循岩浆机制。
                PointedDripstoneBlock.LAVA_TRANSFER_PROBABILITY_PER_RANDOM_TICK,
                // 使用的滴落粒子。可以为 null；为 null 时使用维度默认粒子，
                // 下界使用岩浆滴落粒子，其他维度使用水滴落粒子。
                // 假设在 ModParticles.DRIPPING_DRIPSTONE_MOLTEN_IRON 创建了粒子，并在这里使用。
                ModParticles.DRIPPING_DRIPSTONE_MOLTEN_IRON.get(),
                // 滴落后用来把空炼药锅替换成的装满炼药锅方块。
                ModBlocks.MOLTEN_IRON_CAULDRON.get(),
                // 填充炼药锅时播放的声音。可以为 null；为 null 时不播放声音。
                // 与粒子一样，假设在
                // ModSounds.POINTED_DRIPSTONE_DRIP_MOLTEN_IRON_INTO_CAULDRON
                // 创建了声音事件，并在这里使用。
                ModSounds.POINTED_DRIPSTONE_DRIP_MOLTEN_IRON_INTO_CAULDRON.get()
        );
```

:::tip
要为滴水石滴水创建自定义粒子或声音事件，请分别参阅[粒子][particles]和[声音][sounds]文章。
:::

[block]: ../blocks/index.md
[blockstate]: ../blocks/states.md
[fluid]: index.md
[i18n]: ../resources/client/i18n.md#datagen
[loottable]: ../resources/server/loottables/index.md#datagen
[models]: ../resources/client/models/datagen.md
[particles]: ../resources/client/particles.md
[sounds]: ../resources/client/sounds.md
[tags]: ../resources/server/tags.md#datagen
