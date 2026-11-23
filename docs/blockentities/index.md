# 方块实体

当[方块状态][blockstate]不适合保存数据时，方块实体可以在[方块][block]上保存数据。物品栏等具有非有限数量选项的数据尤其如此。方块实体固定并绑定在某个方块上，除此之外与[实体][entities]有许多相似之处，因此得名。

:::note
如果方块只有有限且较少的可能状态（最多几百种），应考虑改用[方块状态][blockstate]。
:::

## 创建和注册方块实体

与实体一样、与方块不同，`BlockEntity` 类表示方块实体实例，而不是[注册][registration]的单例对象。单例由 `BlockEntityType<?>` 类表示。创建新方块实体需要这两者。

首先创建方块实体类：

```java
public class MyBlockEntity extends BlockEntity {
    public MyBlockEntity(BlockPos pos, BlockState state) {
        super(type, pos, state);
    }
}
```

你可能注意到，我们把未定义的变量 `type` 传给了父构造方法。暂时保留这个未定义变量，先来看注册。

[注册][registration]方式与实体类似。创建关联单例 `BlockEntityType<?>` 的实例，并把它注册到方块实体类型注册表：

```java
public static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITY_TYPES =
        DeferredRegister.create(Registries.BLOCK_ENTITY_TYPE, ExampleMod.MOD_ID);

public static final Supplier<BlockEntityType<MyBlockEntity>> MY_BLOCK_ENTITY = BLOCK_ENTITY_TYPES.register(
        "my_block_entity",
        // 方块实体类型。
        () -> new BlockEntityType<>(
                // 用于构造方块实体实例的提供者。
                MyBlockEntity::new,
                // 可选的布尔值。为 true 时，只允许拥有 OP 权限的玩家
                // 加载 NBT 数据（例如放置方块物品）。
                false,
                // 可以拥有此方块实体的方块可变参数。
                // 这里假设相应方块是 DeferredBlock<Block>。
                MyBlocks.MY_BLOCK_1.get(), MyBlocks.MY_BLOCK_2.get()
        )
);
```

:::note
请记住，`DeferredRegister` 必须注册到[模组事件总线][modbus]！
:::

现在有了方块实体类型，可以用它替换前面留下的 `type` 变量：

```java
public class MyBlockEntity extends BlockEntity {
    public MyBlockEntity(BlockPos pos, BlockState state) {
        super(MY_BLOCK_ENTITY.get(), pos, state);
    }
}
```

:::info
这种看似令人困惑的设置过程是因为 `BlockEntityType` 需要一个 `BlockEntityType.BlockEntitySupplier<T extends BlockEntity>`，它基本相当于 `BiFunction<BlockPos, BlockState, T extends BlockEntity>`。因此，能够用 `::new` 直接引用构造方法非常有利。不过，我们又必须把构造出的方块实体类型传给 `BlockEntity` 唯一且默认的构造方法，所以需要在几处传递引用。
:::

最后，需要修改与方块实体关联的方块类。这意味着不能把方块实体附加到简单的 `Block` 实例，而需要方块子类：

```java
// 关键在于实现 EntityBlock 接口并重写 #newBlockEntity 方法。
public class MyEntityBlock extends Block implements EntityBlock {
    // 调用父类构造方法。
    public MyEntityBlock(BlockBehaviour.Properties properties) {
        super(properties);
    }

    // 在这里返回方块实体的新实例。
    @Override
    public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
        return new MyBlockEntity(pos, state);
    }
}
```

随后自然需要在[方块注册][blockreg]中把该子类作为方块类型：

```java
public static final DeferredBlock<MyEntityBlock> MY_BLOCK_1 =
        BLOCKS.register("my_block_1", () -> new MyEntityBlock( /* ... */ ));
public static final DeferredBlock<MyEntityBlock> MY_BLOCK_2 =
        BLOCKS.register("my_block_2", () -> new MyEntityBlock( /* ... */ ));
```

## 保存数据

`BlockEntity` 的主要用途之一是保存数据。方块实体可以通过两种方式保存数据：读写[值 I/O][valueio]，或使用[数据附件][dataattachments]。本节介绍值 I/O 的读写；数据附件请参阅对应文章。

:::info
顾名思义，数据附件的主要用途是把数据附加到已有方块实体上，例如原版或其他模组提供的方块实体。对于自己模组的方块实体，更推荐直接在值 I/O 中保存和加载数据。
:::

可以通过 `#loadAdditional` 和 `#saveAdditional` 从[值 I/O][valueio]读取和写入数据。方块实体被同步到磁盘或通过网络同步时会调用这些方法。

```java
public class MyBlockEntity extends BlockEntity {
    // 可以是任意类型和值，只要能够以某种方式序列化到值 I/O 中。
    // 这里使用 int 作为示例。
    private int value;

    public MyBlockEntity(BlockPos pos, BlockState state) {
        super(MY_BLOCK_ENTITY.get(), pos, state);
    }

    // 在这里从传入的 ValueInput 读取值。
    @Override
    public void loadAdditional(ValueInput input) {
        super.loadAdditional(input);
        // 如果缺失则默认为 0。更多信息见 ValueIO 文章。
        this.value = input.getIntOr("value", 0);
    }

    // 在这里把值写入传入的 ValueOutput。
    @Override
    public void saveAdditional(ValueOutput output) {
        super.saveAdditional(output);
        output.putInt("value", this.value);
    }
}
```

这两个方法都必须调用父类实现，因为父类会添加位置等基础信息。标签名 `id`、`x`、`y`、`z`、`NeoForgeData` 和 `neoforge:attachments` 由父类保留，不应自行使用。

当然，除了处理默认值，还需要设置其他值。可以像操作普通字段一样自由修改它们。不过，如果希望游戏保存改动，修改后必须调用 `#setChanged()`，把方块实体所在区块标记为 dirty（即需要保存）。如果不调用该方法，Minecraft 的保存系统可能跳过该方块实体，因为它只保存被标记为 dirty 的区块。

### 移除方块实体 {#removing-block-entities}

有时，可能希望方块实体在移除时导出数据，例如被玩家破坏时掉落物品栏。此时应在 `BlockEntity#preRemoveSideEffects` 中处理逻辑。默认情况下，如果方块实体实现了 [`Container`][container]，破坏时就会掉落保存的内容。

```java
public class MyBlockEntity extends BlockEntity {

    @Override
    public void preRemoveSideEffects(BlockPos pos, BlockState state) {
        super.preRemoveSideEffects(pos, state);
        // 在这里执行移除时剩余的导出逻辑。
    }
}
```

:::warning
如果使用 `Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 标志移除方块，就不会调用此方法。使用 clone 命令或严格模式放置结构时通常是这种情况。
:::

如果相邻方块需要知道方块实体被破坏（例如物品栏通过比较器输出红石信号），方块应重写 `BlockBehaviour#affectNeighborsAfterRemoval`。输出红石信号的方块实体通常在这里调用 `Containers#updateNeighboursAfterDestroy`。

```java
public class MyEntityBlock extends Block implements EntityBlock {

    @Override
    protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
        // 处理要在周围相邻方块上执行的逻辑
        Containers.updateNeighboursAfterDestroy(state, level, pos);
    }
}
```

## Ticker

方块实体另一个非常常见的用途是 tick，通常还会配合保存数据。Tick 指每个游戏 tick 执行一次代码。通过重写 `EntityBlock#getTicker` 并返回 `BlockEntityTicker` 实现；后者基本是一个接收四个参数（世界、位置、方块状态和方块实体）的 consumer：

```java
// 注意：ticker 定义在方块中，而不是方块实体中。不过，良好做法是通过
// 静态 #tick 方法等方式，把 tick 逻辑保留在方块实体内。
public class MyEntityBlock extends Block implements EntityBlock {
    // 其他内容

    // 由于泛型转换，这里使用第二个方法。
    // 如果继承 `BaseEntityBlock`，其中也有相同的 protected static 方法。
    private static <E extends BlockEntity, A extends BlockEntity> @Nullable BlockEntityTicker<A> createTickerHelper(
        BlockEntityType<A> type, BlockEntityType<E> checkedType, BlockEntityTicker<? super E> ticker
    ) {
        return checkedType == type ? (BlockEntityTicker<A>) ticker : null;
    }

    @Override
    public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
        // 可以根据任意因素在这里返回不同 ticker。常见做法包括：
        // 在客户端和服务端返回不同 ticker、只在一个端 tick，
        // 或只对某些方块状态返回 ticker（例如使用“机器正在工作”属性时）。
        return createTickerHelper(type, MY_BLOCK_ENTITY.get(), MyBlockEntity::tick);
    }
}

public class MyBlockEntity extends BlockEntity {
    // 其他内容

    // 此方法签名与 BlockEntityTicker 函数式接口一致。
    public static void tick(Level level, BlockPos pos, BlockState state, MyBlockEntity blockEntity) {
        // 在这里执行每个 tick 所需的操作。
        // 例如，可以修改制作进度或消耗能量。
    }
}
```

注意，`#tick` 每个 tick 都会调用。因此应尽量避免在其中执行大量复杂计算，例如每隔 X 个 tick 才计算一次，或缓存计算结果。

## 同步

方块实体逻辑通常在服务端运行，因此需要告知客户端正在发生什么。有三种方式：区块加载时同步、方块更新时同步，或使用自定义数据包。通常只应在必要时同步信息，避免无谓占用网络。

### 区块加载时同步

每次从网络或磁盘读取区块时都会加载区块，并因此使用此方法。要发送数据，需要重写以下方法：

```java
public class MyBlockEntity extends BlockEntity {
    // ...

    // 在这里创建更新标签。对于只有少量字段的方块实体，可以直接调用 #saveWithoutMetadata。
    @Override
    public CompoundTag getUpdateTag(HolderLookup.Provider registries) {
        return this.saveWithoutMetadata(registries);
    }

    // 在这里处理接收到的更新标签。默认实现会调用 #loadWithComponents，
    // 因此如果没有额外逻辑，就不需要重写此方法。
    @Override
    public void handleUpdateTag(ValueInput input) {
        super.handleUpdateTag(input);
    }
}
```

### 方块更新时同步 {#syncing-on-block-update}

每次方块更新时使用此方式。方块更新必须手动触发，但处理速度通常比区块同步更快。

```java
public class MyBlockEntity extends BlockEntity {
    // ...

    // 像上面一样在这里创建更新标签。
    @Override
    public CompoundTag getUpdateTag(HolderLookup.Provider registries) {
        return this.saveWithoutMetadata(registries);
    }

    // 在这里返回数据包。返回非 null 结果会告诉游戏使用该数据包进行同步。
    @Override
    public Packet<ClientGamePacketListener> getUpdatePacket() {
        // 数据包使用 #getUpdateTag 返回的 CompoundTag。它还提供 #create 重载，
        // 允许指定自定义更新标签，并省略客户端不需要的数据。
        return ClientboundBlockEntityDataPacket.create(this);
    }

    // 可选：收到数据包时执行自定义逻辑。
    // super/默认实现会转发到 #loadWithComponents。
    @Override
    public void onDataPacket(Connection connection, ValueInput input) {
        super.onDataPacket(connection, input);
        // 在这里执行所需操作。
    }
}
```

要实际发送数据包，必须在服务端调用 `Level#sendBlockUpdated(BlockPos pos, BlockState oldState, BlockState newState, int flags)` 触发更新通知。位置应为方块实体的位置，可通过 `BlockEntity#getBlockPos` 取得。两个方块状态参数都可以使用方块实体位置的方块状态，可通过 `BlockEntity#getBlockState` 取得。`flags` 参数是更新掩码，与 [`Level#setBlock`][setblock]中的用法相同。

### 使用自定义数据包

使用专门的更新数据包时，可以在需要时自行发送。这种方式最灵活，但也最复杂，因为它需要设置网络处理器。可以通过 `PacketDistributor#sendToPlayersTrackingChunk` 向所有追踪该方块实体的玩家发送数据包。更多信息请参阅[网络通信][networking]部分。

:::caution
必须进行安全检查，因为消息到达玩家时，`BlockEntity` 可能已经被破坏或替换。还应通过 `Level#hasChunkAt` 检查区块是否已加载。
:::

[block]: ../blocks/index.md
[blockreg]: ../blocks/index.md#basic-blocks
[blockstate]: ../blocks/states.md
[container]: ../inventories/container.md
[dataattachments]: ../datastorage/attachments.md
[entities]: ../entities/index.md
[modbus]: ../concepts/events.md#event-buses
[networking]: ../../26.1/networking/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[setblock]: ../blocks/states.md#levelsetblock
[valueio]: ../datastorage/valueio.md
