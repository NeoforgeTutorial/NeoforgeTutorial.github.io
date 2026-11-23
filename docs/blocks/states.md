# 方块状态

你经常会遇到需要为同一个方块定义不同状态的情况。例如，小麦作物有八个生长阶段，为每个阶段创建独立方块显然并不合理。再比如台阶或类似台阶的方块：一个底部状态、一个顶部状态，以及一个同时占据上下两半的状态。

这时就要使用方块状态（blockstate）。方块状态可以方便地表示方块可能具有的不同状态，例如生长阶段或台阶的放置类型。

## 方块状态属性

方块状态使用属性系统。一个方块可以拥有多个不同类型的属性。例如，末地传送门框架有两个属性：是否已经插入末影之眼（`eye`，2 个选项）以及放置朝向（`facing`，4 个选项）。因此，它一共有 8（2 * 4）种不同的方块状态：

```
minecraft:end_portal_frame[facing=north,eye=false]
minecraft:end_portal_frame[facing=east,eye=false]
minecraft:end_portal_frame[facing=south,eye=false]
minecraft:end_portal_frame[facing=west,eye=false]
minecraft:end_portal_frame[facing=north,eye=true]
minecraft:end_portal_frame[facing=east,eye=true]
minecraft:end_portal_frame[facing=south,eye=true]
minecraft:end_portal_frame[facing=west,eye=true]
```

`blockid[property1=value1,property2=value,...]` 是用文本表示方块状态的标准写法，原版在某些位置也使用它，例如命令中。

如果方块没有定义任何方块状态属性，它仍然恰好有一个方块状态，也就是不指定任何属性的状态，因为没有属性可填。它可以写作 `minecraft:oak_planks[]`，也可以直接写作 `minecraft:oak_planks`。

与方块一样，每个 `BlockState` 在内存中都只存在一个实例。因此，可以使用而且应该使用 `==` 比较 `BlockState`。`BlockState` 还是 final 类，不能被继承。**所有功能都应放在对应的[方块][block]类中！**

## 何时使用方块状态

### 方块状态与独立方块

一个简单的判断规则是：**如果两个东西的名称不同，就应做成独立方块。** 以椅子方块为例，椅子的朝向适合做成属性，而不同木材种类则应做成不同的方块。因此，每种木材都有一个椅子方块，而每个椅子方块都有四个方块状态（分别对应四个朝向）。

### 方块状态与[方块实体][blockentity]

这里的判断规则是：**如果状态数量有限，就使用方块状态；如果状态数量无限或接近无限，就使用方块实体。** 方块实体可以保存任意数量的数据，但性能开销高于方块状态。

方块状态和方块实体可以配合使用。例如，箱子使用方块状态属性表示朝向、是否含水或是否组成大箱子，而物品栏、箱子当前是否打开以及与漏斗的交互等则由方块实体处理。

“方块状态最多可以有多少种”并没有绝对答案，但我们建议：如果数据超过 8 到 9 位（也就是超过几百种状态），应改用方块实体。

## 实现方块状态

要实现方块状态属性，请在方块类中创建或引用一个 `public static final Property<?>` 常量。你可以自行实现 `Property<?>`，但原版代码提供了若干便捷实现，通常足以覆盖大多数用途：

- `IntegerProperty`
    - 实现 `Property<Integer>`，定义保存整数值的属性。注意，不支持负值。
    - 通过 `IntegerProperty#create(String name, int min, int max)` 创建。
- `BooleanProperty`
    - 实现 `Property<Boolean>`，定义值为 `true` 或 `false` 的属性。
    - 通过 `BooleanProperty#create(String name)` 创建。
- `EnumProperty<E extends Enum<E>>`
    - 实现 `Property<E>`，定义值来自某个枚举类的属性。
    - 通过 `EnumProperty#create(String name, Class<E> enumClass)` 创建。
    - 也可以只使用枚举值的一个子集（例如从 16 个 `DyeColor` 中选取 4 个），参见 `EnumProperty#create` 的重载。

`BlockStateProperties` 类包含原版共用属性。只要可能，就应使用或引用这些属性，而不是自行创建新属性。

获得属性常量后，请在方块类中重写 `Block#createBlockStateDefinition(StateDefinition.Builder)`，并在该方法中调用 `StateDefinition.Builder#add(YOUR_PROPERTY);`。`StateDefinition.Builder#add` 接收可变参数，因此有多个属性时可以一次全部加入。

每个方块还有一个默认状态。如果没有另行指定，默认状态会使用所有属性的默认值。可以在构造方法中调用 `Block#registerDefaultState(BlockState)` 来修改默认状态。

如果希望修改放置方块时使用的 `BlockState`，请重写 `Block#getStateForPlacement(BlockPlaceContext)`。例如，可以根据玩家放置方块时的位置或视线方向设置方块朝向。

以 `EndPortalFrameBlock` 类为例，相关代码如下：

```java
public class EndPortalFrameBlock extends Block {
    // 注意：可以直接使用 BlockStateProperties 中的值，而不必在这里再次引用。
    // 不过，为了简单易读，建议像下面这样添加常量。
    public static final EnumProperty<Direction> FACING = BlockStateProperties.FACING;
    public static final BooleanProperty EYE = BlockStateProperties.EYE;

    public EndPortalFrameBlock(BlockBehaviour.Properties properties) {
        super(properties);
        // stateDefinition.any() 会从内部集合中返回一个随机 BlockState，
        // 这并不重要，因为下面会自行设置所有值。
        this.registerDefaultState(stateDefinition.any()
                .setValue(FACING, Direction.NORTH)
                .setValue(EYE, false)
        );
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        // 属性会在这里实际加入方块状态
        builder.add(FACING, EYE);
    }

    @Override
    @Nullable
    public BlockState getStateForPlacement(BlockPlaceContext ctx) {
        // 根据 BlockPlaceContext 决定放置这个方块时使用哪个状态的代码
    }
}
```

## 使用方块状态 {#using-blockstates}

要从 `Block` 取得 `BlockState`，请调用 `Block#defaultBlockState()`。如上一节所述，可以通过 `Block#registerDefaultState` 修改默认方块状态。

可以调用 `BlockState#getValue(Property<?>)` 并传入目标属性，取得相应的属性值。继续使用末地传送门框架作为例子：

```java
// EndPortalFrameBlock.FACING 是 EnumPropery<Direction>，因此可以从 BlockState 取得 Direction
Direction direction = endPortalFrameBlockState.getValue(EndPortalFrameBlock.FACING);
```

如果要取得具有其他属性值组合的 `BlockState`，请在现有方块状态上调用 `BlockState#setValue(Property<T>, T)` 并传入属性和目标值。以末地传送门框架为例：

```java
endPortalFrameBlockState = endPortalFrameBlockState.setValue(EndPortalFrameBlock.FACING, Direction.SOUTH);
```

:::note
`BlockState` 是不可变对象。因此，调用 `#setValue(Property<T>, T)` 并不会修改原来的方块状态，而是在内部执行查找，并返回具有这组精确属性值的唯一对象。这也意味着，如果只调用 `state#setValue` 而没有把结果保存回变量（例如保存回 `state`），就不会产生任何效果。
:::

要从世界取得 `BlockState`，请使用 `Level#getBlockState(BlockPos)`。

### `Level#setBlock` {#levelsetblock}

要在世界中设置 `BlockState`，请使用 `Level#setBlock(BlockPos, BlockState, int)`。

`int` 参数表示更新标志，它的含义并不那么直观，因此需要额外说明。

为便于正确设置更新标志，`Block` 中定义了一系列以 `UPDATE_` 为前缀的 `int` 常量。如果需要组合多个标志，可以使用按位或，例如 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS`。

- `Block.UPDATE_NEIGHBORS` 向相邻方块发送更新，具体会调用 `Block#neighborChanged`，并进一步调用多个方法，其中大多数与红石有关。
- `Block.UPDATE_CLIENTS` 把方块更新同步到客户端。
- `Block.UPDATE_INVISIBLE` 明确不在客户端更新，并且会覆盖 `Block.UPDATE_CLIENTS`，使更新不同步到客户端。服务端始终会更新方块。
- `Block.UPDATE_IMMEDIATE` 强制在客户端主线程重新渲染。
- `Block.UPDATE_KNOWN_SHAPE` 停止相邻方块更新的递归。
- `Block.UPDATE_SUPPRESS_DROPS` 禁止该位置旧方块的掉落物。
- `Block.UPDATE_MOVE_BY_PISTON` 仅由活塞代码用于表示方块被活塞移动，主要用于延迟光照引擎更新。
- `Block.UPDATE_SKIP_SHAPE_UPDATE_ON_WIRE` 由 `ExperimentalRedstoneWireEvaluator` 用于表示是否跳过形状更新。只有在信号强度不是因放置而改变，或信号原始来源不是当前红石线时才会设置。
- `Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 阻止调用 `BlockEntity#preRemoveSideEffects`，通常用于防止方块实体清空内容。
- `Block.UPDATE_SKIP_ON_PLACE` 阻止调用 `Block#onPlace`，通常会阻止方块执行初始行为（例如让铁轨连接相邻方块、生成铁傀儡）。
- `Block.UPDATE_NONE` 是 `Block.UPDATE_INVISIBLE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 的别名。
- `Block.UPDATE_ALL` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS` 的别名。
- `Block.UPDATE_ALL_IMMEDIATE` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS | Block.UPDATE_IMMEDIATE` 的别名。
- `Block.UPDATE_SKIP_ALL_SIDEEFFECTS` 是 `Block.UPDATE_SKIP_ON_PLACE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS | Block.UPDATE_SUPPRESS_DROPS | Block.UPDATE_KNOWN_SHAPE` 的别名。

另有一个便捷方法 `Level#setBlockAndUpdate(BlockPos pos, BlockState state)`，内部会调用 `setBlock(pos, state, Block.UPDATE_ALL)`。

[block]: index.md
[blockentity]: ../blockentities/index.md
