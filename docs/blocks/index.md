# 方块

方块是 Minecraft 世界的基础。所有地形、结构和机器都由方块构成。如果你打算制作模组，很可能也希望添加一些方块。本文介绍如何创建方块，以及可以使用方块完成的一些操作。

## 一种方块只创建一个实例 {#one-block-to-rule-them-all}

开始之前，需要先理解：游戏中的每种方块始终只有一个实例。世界中有成千上万个位置引用这同一个方块。换句话说，同一个方块只是在许多位置被反复显示。

因此，每个方块只应在[注册][registration]期间实例化一次。方块注册完成后，就可以按需使用注册得到的引用。

与大多数其他注册表不同，方块可以使用专用版 `DeferredRegister`，即 `DeferredRegister.Blocks`。它的作用基本等同于 `DeferredRegister<Block>`，但有几点小差异：

- 使用 `DeferredRegister.createBlocks("yourmodid")` 创建，而不是普通的 `DeferredRegister.create(...)` 方法。
- `#register` 返回 `DeferredBlock<T extends Block>`，它是 `DeferredHolder<Block, T>` 的子类。`T` 是正在注册的方块类类型。
- 提供了一些注册方块的辅助方法，详见[下文][below]。

现在注册方块：

```java
//BLOCKS 是一个 DeferredRegister.Blocks
public static final DeferredBlock<Block> MY_BLOCK = BLOCKS.register("my_block", registryName -> new Block(...));
```

注册方块后，所有对新的 `my_block` 的引用都应使用这个常量。例如，检查某个位置的方块是否为 `my_block`：

```java
level.getBlockState(position) // 返回给定世界（level）给定位置上的方块状态
    //highlight-next-line
    .is(MyBlockRegistrationClass.MY_BLOCK);
```

这种方式还有一个便利之处：`block1 == block2` 可以正常工作，并能代替 Java 的 `equals` 方法（`equals` 仍然可用，但它本来也按引用比较，因此没有必要）。

:::danger
不要在注册之外调用 `new Block()`！只要这样做，就可能而且确实会出问题：

- 方块必须在注册表未冻结时创建。NeoForge 会为你解冻注册表，并在稍后重新冻结；注册阶段就是创建方块的时间窗口。
- 如果在注册表再次冻结后创建或注册方块，游戏会崩溃并报告方块为 `null`，这会非常令人困惑。
- 如果仍然持有悬空的方块实例，游戏在同步和保存时不会识别它，并会用空气替换它。
:::

## 创建方块

如前所述，首先创建 `DeferredRegister.Blocks`：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");
```

### 基础方块 {#basic-blocks}

不需要特殊功能的简单方块（例如圆石、木板等）可以直接使用 `Block` 类。注册时，用 `BlockBehaviour.Properties` 参数实例化 `Block`。`BlockBehaviour.Properties` 可以通过 `BlockBehaviour.Properties#of` 创建，并可调用其方法进行配置。最重要的方法包括：

- `setId`：设置方块的资源键。
    - 每个方块都**必须**设置它，否则会抛出异常。
- `destroyTime`：决定破坏方块所需的时间。
    - 石头为 1.5，泥土为 0.5，黑曜石为 50，基岩为 -1（不可破坏）。
- `explosionResistance`：决定方块的爆炸抗性。
    - 石头为 6.0，泥土为 0.5，黑曜石为 1,200，基岩为 3,600,000。
- `sound`：设置方块被击打、破坏或放置时的声音。
    - 默认值为 `SoundType.STONE`。更多信息见[声音页面][sounds]。
- `lightLevel`：设置方块的发光等级，接收一个带 `BlockState` 参数、返回 0 到 15 的函数。
    - 例如，荧石使用 `state -> 15`，火把使用 `state -> 14`。
- `friction`：设置方块摩擦系数（滑动程度）。
    - 默认为 0.6，冰使用 0.98。

例如，一个简单实现如下：

```java
//BLOCKS 是一个 DeferredRegister.Blocks
public static final DeferredBlock<Block> MY_BETTER_BLOCK = BLOCKS.register(
    "my_better_block",
    registryName -> new Block(BlockBehaviour.Properties.of()
        //highlight-start
        .setId(ResourceKey.create(Registries.BLOCK, registryName))
        .destroyTime(2.0f)
        .explosionResistance(10.0f)
        .sound(SoundType.GRAVEL)
        .lightLevel(state -> 7)
        //highlight-end
    ));
```

更多文档请参阅 `BlockBehaviour.Properties` 源码。更多示例或 Minecraft 使用的值，可查看 `Blocks` 类。

:::note
需要理解，世界中的方块和物品栏中的方块并不是同一种东西。物品栏里看起来像方块的物品实际上是 `BlockItem`，即一种在[物品][item]被使用时放置方块的[特殊物品][item]。因此，创造模式标签页或最大堆叠数量等属性由对应的 `BlockItem` 处理。

`BlockItem` 必须与方块分开注册。这是因为方块不一定需要物品形式，例如火焰就不需要被玩家收集。
:::

### 更多功能

直接使用 `Block` 只能创建非常基础的方块。如果需要添加玩家交互或不同碰撞箱等功能，就必须创建继承 `Block` 的自定义类。`Block` 提供许多可重写方法来执行不同操作；详情请参阅 `Block`、`BlockBehaviour` 和 `IBlockExtension`。下文[使用方块][usingblocks]一节还列出了常见用例。

如果需要创建有多种变体的方块（例如有底部、顶部和双层变体的台阶），应使用[方块状态][blockstates]。最后，如果需要保存附加数据（例如保存物品栏的箱子），应使用[方块实体][blockentities]。简单规则是：状态数量有限且较少（最多几百种）时使用方块状态；状态数量无限或接近无限时使用方块实体。

#### 方块类型

方块类型是用于序列化和反序列化方块对象的 [`MapCodec`][codec]。这个 `MapCodec` 通过 `BlockBehaviour#codec` 设置，并[注册][registration]到方块类型注册表。目前它只在生成方块列表报告时使用。每个 `Block` 子类都应创建一次方块类型。例如，`FlowerBlock#CODEC` 表示大多数花的方块类型，而它的子类 `WitherRoseBlock` 有单独的方块类型。

如果方块子类只接收 `BlockBehaviour.Properties`，可以使用 `BlockBehaviour#simpleCodec` 创建 `MapCodec`：

```java
// 位于某个方块子类中
public class SimpleBlock extends Block {
    public SimpleBlock(BlockBehavior.Properties properties) {
        // ...
    }

    @Override
    public MapCodec<SimpleBlock> codec() {
        return SIMPLE_CODEC.get();
    }
}

// 位于某个注册类中
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<SimpleBlock>> SIMPLE_CODEC = REGISTRAR.register(
    "simple",
    () -> BlockBehaviour.simpleCodec(SimpleBlock::new)
);
```

如果方块子类还有更多参数，应使用 [`RecordCodecBuilder#mapCodec`][codec] 创建 `MapCodec`，并把 `BlockBehaviour#propertiesCodec` 作为 `BlockBehaviour.Properties` 参数传入：

```java
// 位于某个方块子类中
public class ComplexBlock extends Block {
    public ComplexBlock(int value, BlockBehavior.Properties properties) {
        // ...
    }

    @Override
    public MapCodec<ComplexBlock> codec() {
        return COMPLEX_CODEC.get();
    }

    public int getValue() {
        return this.value;
    }
}

// 位于某个注册类中
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<ComplexBlock>> COMPLEX_CODEC = REGISTRAR.register(
    "simple",
    () -> RecordCodecBuilder.mapCodec(instance ->
        instance.group(
            Codec.INT.fieldOf("value").forGetter(ComplexBlock::getValue),
            BlockBehaviour.propertiesCodec() // 表示 BlockBehavior.Properties 参数
        ).apply(instance, ComplexBlock::new)
    )
);
```

:::note
虽然方块类型目前基本没有被使用，但 Mojang 正继续向以 Codec 为中心的结构迁移，预计它以后会变得更加重要。
:::

### `DeferredRegister.Blocks` 辅助方法 {#deferredregisterblocks-helpers}

我们已经在[上文][above]介绍了如何创建 `DeferredRegister.Blocks`，以及它会返回 `DeferredBlock`。下面看看这个专用 `DeferredRegister` 还提供哪些工具，先从 `#registerBlock` 开始：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.register(
    "example_block", registryName -> new Block(
        BlockBehaviour.Properties.of()
            // 必须为方块设置 ID
            .setId(ResourceKey.create(Registries.BLOCK, registryName))
    )
);

// 与上面相同，只是把方块属性单独提供。
// setId 也会在内部对属性对象调用。
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // 接收属性的工厂。
    () -> BlockBehaviour.Properties.of() // 要使用的属性。
);

// 与上面相同，只是提供并操作 `Properties#of`。
// setId 也会在内部对属性对象调用。
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // 接收属性的工厂。
    props -> props // 用于转换属性的 unary operator。
);
```

如果使用 `Block::new`，可以完全省略工厂：

```java
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    () -> BlockBehaviour.Properties.of() // 要使用的属性。
);

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    props -> props // 用于转换属性的 unary operator。
);
```

这与前面的例子完全相同，只是稍短一些。如果使用 `Block` 子类而不是 `Block` 本身，则必须使用前一种方法。

### 资源

注册方块并把它放入世界后，你会发现它缺少贴图等内容。这是因为[贴图][textures]等内容由 Minecraft 的资源系统处理。在 Minecraft 中添加新方块时，应编写或[生成][datagen]以下文件：

- [方块状态文件][bsfile]
- [方块模型][model]
- [翻译][i18n]
- [战利品表][loottable]
- 一些方块[标签][tags]，例如用于挖掘的标签

对于上述内容，也可以参考类似原版方块的文件和数据生成器。

## 使用方块 {#using-blocks}

方块很少被直接用来执行操作。事实上，Minecraft 中最常见的两个操作——取得某位置的方块和设置某位置的方块——使用的是方块状态，而不是方块。总体设计是让方块定义行为，但实际通过方块状态来运行行为。因此，`BlockState` 经常作为参数传入 `Block` 的方法。关于方块状态的使用方式以及如何从方块取得状态，请参阅[使用方块状态][usingblockstates]。

多种场景会在不同时间调用 `Block` 的多个方法。下面列出最常见的方块相关流程。除非另有说明，所有方法都会在两个逻辑端调用，并且应返回相同结果。

### 放置方块

方块放置逻辑从 `BlockItem#useOn` 开始（或子类的对应实现，例如睡莲使用的 `PlaceOnWaterBlockItem`）。关于游戏如何到达这里，请参阅[右键单击物品][rightclick]。实际效果是：方块物品（例如圆石物品）被右键单击时，就会调用这套逻辑。

- 会检查若干前置条件，例如玩家不在旁观模式、方块所需的功能标志均已启用、目标位置没有超出世界边界等。只要有一项检查失败，流程就会结束。
- 对当前位于目标位置的方块调用 `BlockBehaviour#canBeReplaced`。如果返回 `false`，流程结束。高草或雪层是返回 `true` 的典型情况。
- 调用 `Block#getStateForPlacement`。该方法会根据上下文（包括位置、旋转和放置所点击的面）返回不同的方块状态，适用于可以朝不同方向放置的方块。
- 使用上一步得到的方块状态调用 `BlockBehaviour#canSurvive`。如果返回 `false`，流程结束。
- 通过 `Level#setBlock` 把方块状态设置到世界中。
    - 在该 `Level#setBlock` 调用中，会调用 `BlockBehaviour#onPlace`。
- 调用 `Block#setPlacedBy`。

### 破坏方块 {#breaking-a-block}

破坏方块需要时间，因此稍微复杂一些。整个过程大致分为三个阶段：“开始”、“挖掘”和“实际破坏”。

- 按下鼠标左键时，进入“开始”阶段。
- 随后需要一直按住左键，进入“挖掘”阶段。**这个阶段的方法每个 tick 都会调用。**
- 如果“持续”阶段没有被打断（例如松开左键），并且方块被破坏，就进入“实际破坏”阶段。

也可以用伪代码表示：

```java
leftClick();
initiatingStage();
while (leftClickIsBeingHeld()) {
    miningStage();
    if (blockIsBroken()) {
        actuallyBreakingStage();
        break;
    }
}
```

下面把这些阶段拆解为实际的方法调用。关于游戏如何从左键单击进入此流程，请参阅[左键单击物品][leftclick]。

#### “开始”阶段

- 会检查若干前置条件，例如玩家不在旁观模式、主手 `ItemStack` 所需的功能标志均已启用、目标方块没有超出世界边界等。只要有一项检查失败，流程就会结束。
- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程结束。
    - 注意，在客户端取消事件后不会向服务端发送数据包，因此服务端不会运行逻辑。
    - 但是，在服务端取消该事件时，客户端代码仍会运行，这可能导致不同步。
- 调用 `BlockBehaviour#attack`。

#### “挖掘”阶段

- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程进入“结束”阶段。
    - 注意，在客户端取消事件后不会向服务端发送数据包，因此服务端不会运行逻辑。
    - 但是，在服务端取消该事件时，客户端代码仍会运行，这可能导致不同步。
- 调用 `BlockBehaviour#getDestroyProgress`，并把结果加入内部破坏进度计数器。
    - `BlockBehaviour#getDestroyProgress` 返回 0 到 1 的浮点数，表示每个 tick 应增加多少破坏进度。
- 相应更新进度覆盖层（裂纹贴图）。
- 如果破坏进度大于 1.0（即已完成，方块应当被破坏），退出“挖掘”阶段并进入“实际破坏”阶段。

#### “实际破坏”阶段

- 调用 `Item#canDestroyBlock`。如果返回 `false`（表示不应破坏该方块），流程进入“结束”阶段。
- 如果方块是 `GameMasterBlock` 的实例，调用 `Player#canUseGameMasterBlocks`，判断玩家是否有权破坏仅创造模式方块。如果返回 `false`，流程进入“结束”阶段。
- 仅服务端：调用 `Player#blockActionRestricted`，判断当前玩家是否不能破坏该方块。如果返回 `true`，流程进入“结束”阶段。
- 仅服务端：触发 `BlockEvent.BreakEvent`。如果事件被取消，流程进入“结束”阶段。事件的初始取消状态由上述三个方法决定。
- 调用 `Block#playerWillDestroy`。
- 仅服务端：调用 `IBlockExtension#canHarvestBlock`，判断方块能否被收获，也就是破坏后能否产生掉落物。如果 `Player#preventsBlockDrops` 返回 true，则忽略此结果。
    - 仅服务端：如果重写了 `IBlockExtension#canHarvestBlock` 且没有调用父实现，则触发 `PlayerEvent.HarvestCheck`。如果 `HarvestCheck#canHarvest` 返回 `false`，就不会调用 `Block#playerDestroy`，从而阻止资源和经验掉落。
- 仅服务端：调用 `Item#mineBlock`。
- 调用 `IBlockExtension#onDestroyedByPlayer`。如果返回 `false`，流程进入“结束”阶段。
    - 通过 `Level#setBlock` 从世界中移除方块状态，参数使用 `Blocks.AIR.defaultBlockState()` 或当前占据位置的流体。
        - 在该 `Level#setBlock` 调用中，会调用 `Block#onRemove`。
    - 如果 `IBlockExtension#onDestroyedByPlayer` 返回 `true`，调用 `Block#destroy`。
- 仅服务端：如果前面对 `IBlockExtension#canHarvestBlock` 和 `IBlockExtension#onDestroyedByPlayer` 的调用都返回 `true`，则调用 `Block#playerDestroy`。
    - 仅服务端：调用 `Block#dropResources`，决定挖掘方块时的掉落物和经验。
        - 仅服务端：触发 `BlockDropsEvent`。如果事件被取消，方块破坏时不掉落任何东西；否则把 `BlockDropsEvent#getDrops` 中的每个 `ItemEntity` 加入当前世界。此外，如果 `getDroppedExperience` 大于 0，会调用 `Block#popExperience`。
            - 仅服务端：调用 `IBlockExtension#getExpDrop`，并由 `EnchantmentHelper#processBlockExperience` 进行增强。这是 `BlockDropsEvent#getDroppedExperience` 的初始值，之后仍可能被修改。
- 仅服务端：如果用于挖掘方块的物品在上述流程中有任何时点损坏，触发 `PlayerDestroyItemEvent`。

#### 挖掘速度 {#mining-speed}

挖掘速度根据方块硬度、所用[工具][tool]的速度以及若干实体[属性][attributes]计算，规则如下：

```java
// 返回工具的挖掘速度；如果手持物品为空、不是工具或不适用于当前方块，则返回 1。
float destroySpeed = item.getDestroySpeed(blockState);
// 如果工具有效，把 minecraft:mining_efficiency 属性作为加法修饰符加入。
if (destroySpeed > 1) {
    destroySpeed += player.getAttributeValue(Attributes.MINING_EFFICIENCY);
}
// 应用急迫或潮涌能量效果。
if (player.hasEffect(MobEffects.HASTE) || player.hasEffect(MobEffects.CONDUIT_POWER)) {
    int haste = player.hasEffect(MobEffects.HASTE)
        ? player.getEffect(MobEffects.HASTE).getAmplifier()
        : 0;
    int conduitPower = player.hasEffect(MobEffects.CONDUIT_POWER)
        ? player.getEffect(MobEffects.CONDUIT_POWER).getAmplifier()
        : 0;
    int amplifier = Math.max(haste, conduitPower);
    destroySpeed *= 1 + (amplifier + 1) * 0.2f;
}
// 应用挖掘疲劳效果。
if (player.hasEffect(MobEffects.MINING_FATIGUE)) {
    destroySpeed *= switch (player.getEffect(MobEffects.MINING_FATIGUE).getAmplifier()) {
        case 0 -> 0.3F;
        case 1 -> 0.09F;
        case 2 -> 0.0027F;
        default -> 8.1E-4F;
    };
}
// 把 minecraft:block_break_speed 属性作为乘法修饰符加入。
destroySpeed *= player.getAttributeValue(Attributes.BLOCK_BREAK_SPEED);
// 如果玩家在水下，乘算水下挖掘速度惩罚。
if (player.isEyeInFluid(FluidTags.WATER)) {
    destroySpeed *= player.getAttributeValue(Attributes.SUBMERGED_MINING_SPEED);
}
// 如果玩家试图在半空中破坏方块，使挖掘速度变为五分之一。
if (!player.onGround()) {
    destroySpeed /= 5;
}
destroySpeed = /* 这里触发 PlayerEvent.BreakSpeed，允许模组作者继续修改该值。 */;
return destroySpeed;
```

精确实现可参考 `Player#getDestroySpeed`。

### Tick

Tick 是每 1/20 秒（50 毫秒，即“一个 tick”）更新部分游戏内容的机制。方块提供多种以不同方式调用的 tick 方法。

#### 服务端 Tick 与 Tick 调度

`BlockBehaviour#tick` 通过计划 tick 调用。可以使用 `Level#scheduleTick(BlockPos, Block, int)` 创建计划 tick，其中 `int` 表示延迟。原版许多地方使用此机制，例如大型垂滴叶的倾斜机制，以及其他显著使用者红石元件。

#### 客户端 Tick

`Block#animateTick` 只在客户端每帧调用。仅客户端行为在这里执行，例如生成火把粒子。

#### 天气 Tick

天气 tick 由 `Block#handlePrecipitation` 处理，独立于普通 tick。它只在服务端、并且只在下雨等天气时调用，概率为 1/16。炼药锅在下雨或下雪时填充就是其中一个用例。

#### 随机 Tick

随机 tick 独立于普通 tick。必须通过调用方块的 `BlockBehaviour.Properties#randomTicks()` 来启用，使方块能够参与随机 tick。

每个 tick 会在区块中选取固定数量的方块执行随机 tick，数量由 `randomTickSpeed` 游戏规则决定。默认值为 3，因此每个 tick 会从区块中随机选取 3 个方块。如果这些方块启用了随机 tick，就会调用对应的 `BlockBehaviour#randomTick`。

Minecraft 许多机制使用随机 tick，例如植物生长、冰雪融化或铜氧化。

[above]: #one-block-to-rule-them-all
[attributes]: ../entities/attributes.md
[below]: #deferredregisterblocks-helpers
[blockentities]: ../blockentities/index.md
[blockstates]: states.md
[bsfile]: ../resources/client/models/index.md#blockstate-files
[codec]: ../datastorage/codecs.md#records
[datagen]: ../resources/index.md#data-generation
[i18n]: ../resources/client/i18n.md
[item]: ../items/index.md
[leftclick]: ../items/interactions.md#left-clicking-an-item
[loottable]: ../resources/server/loottables/index.md
[model]: ../resources/client/models/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[resources]: ../resources/index.md#assets
[rightclick]: ../items/interactions.md#right-clicking-an-item
[sounds]: ../resources/client/sounds.md
[tags]: ../resources/server/tags.md
[textures]: ../resources/client/textures.md
[tool]: ../items/tools.md
[usingblocks]: #using-blocks
[usingblockstates]: states.md#using-blockstates
