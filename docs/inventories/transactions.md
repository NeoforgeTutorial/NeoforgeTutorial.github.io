# 事务

事务（Transaction）是 NeoForge 添加的系统，用于管理不同物品栏之间传输内容的交互。每次传输都围绕三个基本概念进行：被传输的 `Resource`、表示物品栏的 `ResourceHandler`，以及负责协调交互的 `Transaction`。

## 资源

`Resource` 表示事务操作所针对的目标对象。每个 `Resource` 都应不可变，只包含使用何种对象，不包含要传输的对象数量。例如，“五个苹果换一个绿宝石”这一事务包含 `Resource`“苹果”和“绿宝石”，而不是“五个苹果”和“一个绿宝石”。

因此，每个 `Resource` 都具有以下三种属性：

* **不可变性**：`Resource` 对象中保存的任何内容都不应改变。
* **数量无关性**：`Resource` 不包含对象数量信息。
* **相等性**：无论 `Resource` 如何构造，只要表示同一个对象，它们就必须相等。

NeoForge 通过表示对象及其唯一[数据组件][datacomponent]，为[物品][items]提供 `ItemResource`，为流体提供 `FluidResource`。

```java
// 从目标对象创建资源
ItemResource item = ItemResource.of(Items.EMERALD);

ItemStack stack = new ItemStack(Items.APPLE);
stack.set(DataComponents.CUSTOM_NAME, Component.literal("Apple?"));
ItemResource itemWithComponents = ItemResource.of(stack);

FluidResource fluid = FluidResource.of(Fluids.WATER);
```

也可以这样创建自己的 `Resource`：

```java
// 假设要表示以下对象：
public class ExampleObject {
    public static final ExampleObject EMPTY = new ExampleObject(-1, 0, Map.of());

    public static final Codec<ExampleObject> CODEC = RecordCodecBuilder.of(instance ->
        instance.group(
            ExtraCodecs.NON_NEGATIVE_INT.fieldOf("id").forGetter(ExampleObject::id),
            ExtraCodecs.NON_NEGATIVE_INT.optionalFieldOf("count", 1).forGetter(ExampleObject::count),
            Codec.unboundedMap(Codec.STRING, Codec.BOOL).optionalFieldOf("flags", Map::of).forGetter(ExampleObject::flags)
        ).apply(instance, ExampleObject::new)
    );

    private final int id;
    private final Map<String, Boolean> flags;
    private int count;

    public ExampleObject(int id, int count, Map<String, Boolean> flags) {
        // ...
    }

    public int id() {
        return this.id;
    }

    public int count() {
        return this.count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public Map<String, Boolean> flags() {
        return this.flags;
    }
}

// 创建资源。
public final class ExampleResource implements Resource {

    private final ExampleObject object;

    public ExampleResource(ExampleObject object) {
        // 强制不可变，并忽略数量。
        this.object = new ExampleObject(
            object.id(), 1, ImmutableMap.copyOf(object.flags())
        );
    }

    public int id() {
        return this.object.id();
    }

    public Map<String, Boolean> flags() {
        return this.object.flags();
    }

    // 定义目标对象何时应被视为空。
    // 这是 `Resource` 定义的唯一方法。
    @Override
    public boolean isEmpty() {
        return this.object.id() == -1;
    }

    // 类的相等性通过实现 `hashCode` 和 `equals` 定义。
    // record 已经自动实现这两个方法。
    @Override
    public int hashCode() {
        // 目标对象本身并不唯一，因此提取使其唯一的组件，
        // 再据此构造哈希值。
        return Objects.hash(this.object.id(), this.object.flags());
    }

    @Override
    public boolean equals(Object obj) {
        // 检查是否为同一对象。
        if (this == obj) return true;
        // 检查是否属于同一个类。
        if (obj == null || this.getClass() != obj.getClass()) return false;
        // 检查资源中的各个组件。
        ExampleResource other = (ExampleResource) obj;
        return this.object.id() == other.object.id()
            && this.object.flags().equals(other.object.flags());
    }

    // 仅为方便理解资源所表示的对象。
    @Override
    public String toString() {
        return Integer.toString(this.object.id()) + "[" 
            + this.object.flags().size() + "]";
    }
}
```

:::note
`Resource` 可以用于基本类型，但并非严格必需（例如能量由 `long` 表示，因此没有 `Resource`）。不过，这样就需要自行重新实现部分资源行为，因为[下文介绍的处理系统][handler]需要使用 `Resource`。
:::

## 资源处理器 {#resource-handlers}

`ResourceHandler<T>` 表示事务中的目标物品栏，其中 `T` 是目标对象所用 `Resource` 的类型。每个处理器通过索引映射到关联内容，例如索引 `0` 对应第一个槽位，索引 `1` 对应第二个槽位，以此类推。对于每个索引，可以检查该位置能否包含某个 `Resource`（`isValid`），或已经存储了什么 `Resource`（`getResource`）。还可以检查该位置能存储多少 `Resource`（`getCapacityAsLong` / `getCapacityAsInt`），以及当前已存储多少（`getAmountAsLong` / `getAmountAsInt`）。处理器可访问的索引数量就是它的 `size`。

为修改目标物品栏的内容，`ResourceHandler` 提供两个方法：`insert` 放入 `Resource`，`extract` 取出 `Resource`。`insert` 和 `extract` 接收三个参数：要操作的 `Resource`、要放入/取出的 `int` 数量，以及表示正在执行该操作的 [transaction] 的 `TransactionContext`，并返回实际放入/取出的数量。这两个方法都会查找第一个可用于放入/取出内容的位置。如果处理器只应在某个指定索引上操作，`insert` 和 `extract` 都提供了接收 `int` 索引的重载。

```java
// 对于某个 ResourceHandler<ItemResource> handler

// 取得处理器中存储的资源。
ItemResource item = handler.getResource(0);
int count = handler.getAmountAsInt(0);

// 取得处理器自身的信息。
int handlerSize = handler.size();
int indexCapacity = handler.getCapacityAsInt(0);
boolean canAcceptApples = handler.isValid(0, ItemResource.of(Items.APPLE));
```

根据目标物品栏的不同，有许多类型的 `ResourceHandler`。有些处理器包装现有原版物品栏，例如用于 [`Container`][container] 的 `VanillaContainerWrapper`、用于[玩家 `Inventory`][playerinv] 的 `PlayerInventoryWrapper`，以及用于[生物实体][livingentity]装备槽的 `LivingEntityEquipmentWrapper`。

```java
// 包装现有容器。
Container container = new SimpleContainer(5);
ResourceHandler<ItemResource> containerWrapper = VanillaContainerWrapper.of(container);

// 包装 `Player` 的玩家物品栏。
ResourceHandler<ItemResource> playerInv = PlayerInventoryWrapper.of(player);

// 包装某个 LivingEntity 实体中的指定装备槽。
ResourceHandler<ItemResource> head = LivingEntityEquipmentWrapper.of(entity, EquipmentSlot.HEAD);
```

其他处理器本身就是物品栏，为希望使用该系统但不想编写太多实现的人提供便利，例如用于 [`ItemStack`][itemstack] 列表的 `ItemStacksResourceHandler`，以及用于 `FluidStack` 列表的 `FluidStacksResourceHandler`。

```java
// 创建 `ItemStack` 存储。
ItemStacksResourceHandler itemStorage = new ItemStacksResourceHandler(5);

// 创建 `FluidStack` 存储。
FluidStacksResourceHandler fluidStorage = new FluidStacksResourceHandler(
    // 处理器大小
    5,
    // 每个索引的最大容量
    1000
);
```

:::note
如果准备把 `StacksResourceHandler` 之一用作物品栏，强烈建议重写 `onContentsChanged`，以处理磁盘写入或网络同步。

```java
// 方块实体示例
public class ExampleBlockEntity extends BlockEntity {

    private final ItemStacksResourceHandler storage = new ItemStacksResourceHandler(5) {
        @Override
        protected void onContentsChanged(int index, ItemStack previousContents) {
            // 安排该方块实体保存数据
            BlockEntity.this.setChanged();
        }
    };

    // ...
}
```
:::

也可以这样创建自己的 `ResourceHandler`：

```java
public class ExampleResourceHandler implements ResourceHandler<ExampleResource> {

    private ExampleObject object;

    public ExampleResourceHandler(ExampleObject object) {
        this.object = object;
    }
    
    @Override
    public int size() {
        // 处理器大小。
        return 1;
    }

    @Override
    public ExampleResource getResource(int index) {
        // 取得所需索引中的资源。

        // 检查边界。
        Objects.checkIndex(index, this.size());
        // 然后取得资源。
        return new ExampleResource(this.object);
    }

    @Override
    public long getAmountAsLong(int index) {
        // 从内容取得数量。
        Objects.checkIndex(index, this.size());
        return this.object.count();
    }

    @Override
    public long getCapacityAsLong(int index, ExampleResource resource) {
        // 给定索引中存储资源时的容量。
        Objects.checkIndex(index, this.size());
        return Integer.MAX_VALUE;
    }

    @Override
    public boolean isValid(int index, ExampleResource resource) {
        // 无论当前位置内容如何，资源能否设置到此索引。
        Objects.checkIndex(index, this.size());
        // 确保资源不为空。
        TransferPreconditions.checkNonEmpty(resource);
        return true;
    }

    @Override
    public int insert(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 把资源插入给定索引，并返回实际放入的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查资源能否从此位置插入。
        ExampleObject current = this.object;
        if (current.count() == 0 || (current.id() == resource.id() && current.flags().equals(resource.flags()) && this.isValid(index, resource))) {
            // 计算要插入的数量。
            int insertedAmount = Math.min(amount, this.getCapacityAsInt(index, resource) - current.count());

            if (insertedAmount > 0) {
                // 更新内容。
                if (current.count() == 0) {
                    this.object = new ExampleObject(
                        resource.id(), insertedAmount, new HashMap<>(resource.flags())
                    );
                } else {
                    this.object.setCount(current.count() + insertedAmount);
                }

                // 返回插入的数量。
                return insertedAmount;
            }
        }

        // 如果不匹配，则不插入。
        return 0;
    }

    @Override
    public int extract(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 从给定索引提取内容，并返回实际取出的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查资源能否从此位置提取。
        ExampleObject current = this.object;
        if (current.id() == resource.id() && current.flags().equals(resource.flags())) {
            // 计算要提取的数量。
            int extracted = Math.min(current.count(), amount);

            if (extracted > 0) {
                // 更新内容。
                this.object.setCount(current.count() - extracted);

                // 返回提取的数量。
                return extracted;
            }
        }

        // 如果不匹配，则不提取。
        return 0;
    }
}
```

或者使用 `StacksResourceHandler`：

```java
public class ExampleStacksResourceHandler extends StacksResourceHandler<ExampleObject, ExampleResource> {

    public ExampleStacksResourceHandler(int size) {
        super(size, ExampleObject.EMPTY, ExampleObject.CODEC);
    }

    public ExampleStacksResourceHandler(NonNullList<ExampleObject> objects) {
        super(objects, ExampleObject.EMPTY, ExampleObject.CODEC);
    }

    @Override
    public ExampleResource getResourceFrom(ExampleObject object) {
        // 从内容构造资源。
        return new ExampleResource(object);
    }

    @Override
    public int getAmountFrom(ExampleObject object) {
        // 从内容取得数量。
        return object.count();
    }

    @Override
    protected ExampleObject getStackFrom(ExampleResource resource, int amount) {
        // 从其资源创建内容。
        return new ExampleObject(resource.id(), amount, new HashMap<>(resource.flags()));
    }

    @Override
    protected int getCapacity(int index, ExampleResource resource) {
        // 给定索引中存储资源时的容量。
        return Integer.MAX_VALUE;
    }

    @Override
    protected ExampleObject copyOf(ExampleObject object) {
        // 构造内容副本。
        return new ExampleObject(object.id(), object.count(), new HashMap<>(object.flags()));
    }

    @Override
    public boolean matches(ExampleObject object, ExampleResource resource) {
        // 检查对象是否与存储的资源匹配。
        return object.id() == resource.id() && object.flags().equals(resource.flags());
    }
}
```

:::tip
NeoForge 还提供 `ResourceStacksResourceHandler`。对于自身就是物品栏中实际对象的 `Resource` 实现，可以使用它，并以 `ResourceStack` 作为存储内容。
:::

### 能量处理器 {#energy-handler}

`EnergyHandler` 是简化版的 `ResourceHandler`，只包含一个索引，并存储 `long`。因此，它只检查可存储多少单位（`getCapacityAsLong` / `getCapacityAsInt`）和已存储多少单位（`getAmountAsLong` / `getAmountAsInt`）。此外，由于只有一个索引，`insert` 和 `extract` 不再接收索引参数；目标对象是基本类型，因此也不再需要 `Resource`。

与 `ResourceHandler` 一样，根据用途可以使用不同类型的 `EnergyHandler`。最常见的是 `SimpleEnergyHandler`，它提供基本实现以及插入/提取限制。

```java
// 创建能量处理器。
EnergyHandler energy = new SimpleEnergyHandler(1000);
```

### 物品访问 {#item-access}

`ItemAccess` 也是简化版的 `ResourceHandler`，提供对特定存储位置中单个物品的访问。它通常用于[物品能力][capabilities]中，修改能力所附加到的物品。因此，它只提供当前物品的资源（`getResource`）和数量（`getAmount`）。此外，由于只有一个索引，`insert` 和 `extract` 不再接收索引参数。不过，物品本身也可以保存数据，因此 `ItemAccess` 提供了通过 `getCapability` 访问所存数据的方式，前提是目标为具有 `ItemAccess` 上下文的 `ItemCapability`。

与 `ResourceHandler` 一样，根据用途可以使用不同类型的 `ItemAccess`。最常见的两种是 `PlayerItemAccess`，包装玩家物品栏中的指定槽位；以及 `HandlerItemAccess`，包装 `ResourceHandler` 中的指定索引。

```java
// 为某个位置创建物品访问对象。
// 假设有某个 `Player` player。
ItemAccess access = ItemAccess.forPlayerInteraction(player, InteractionHand.MAIN_HAND);

// 取得所引用物品的数据。
ItemResource item = access.getResource();
int count = access.getAmount();

// 取得物品堆栈上的物品能力。
// 例如，如果该物品是流体容器：
ResourceHandler<FluidResource> fluidContainer = access.getCapability(Capabilities.Fluid.ITEM);
```

## 在处理器之间传输 {#transferring-between-handlers}

`Transaction` 负责在 `ResourceHandler` 之间传输 `Resource`。资源通过其 `ResourceHandler` 进行 `insert` 和 `extract`。只有在调用 `Transaction#commit` 后，插入和提取完成的事务才会被视为有效或完成。

`Transaction` 实现 `AutoCloseable`，因此启动事务的标准方式是使用 `Transaction#openRoot` 的 try-with-resources 块：

```java
// 假设有两个 `ResourceHandler<ItemResource>`：apples 和 emeralds。

// 打开事务。
try (Transaction tx = Transaction.openRoot()) {
    // 从资源处理器插入和提取。
    ItemResource appleResource = ItemResource.of(Items.APPLE);
    ItemResource emeraldResource = ItemResource.of(Items.EMERALD);

    int numOfApples = apples.extract(appleResource, 5, tx);
    int numOfEmeralds = emeralds.extract(emeraldResource, 1, tx);

    // 执行任何必要验证。
    if (numOfApples == 5 && numOfEmeralds == 1) {
        numOfEmeralds = apples.insert(emeraldResource, numOfEmeralds, tx);
        numOfApples = emeralds.insert(appleResource, numOfApples, tx);

        if (numOfApples == 5 && numOfEmeralds == 1) {
            // 把事务标记为完成。
            tx.commit();
        }
    }
}
```

:::tip

`ResourceHandlerUtil` 提供许多实用方法，用于检查 `ResourceHandler` 的当前状态，或在处理器之间执行事务。例如，上面的绿宝石换苹果交易可以简化为：

```java
// 假设有两个 `ResourceHandler<ItemResource>`：apples 和 emeralds。

// 打开事务。
try (Transaction tx = Transaction.openRoot()) {
    // 从资源处理器插入和提取。
    ItemResource appleResource = ItemResource.of(Items.APPLE);
    ItemResource emeraldResource = ItemResource.of(Items.EMERALD);

    int applesMoved = ResourceHandlerUtil.moveStacking(
        // 从 apples 移动到 emeralds。
        apples, emeralds,
        // 检查要移动哪些资源。
        appleResource::equals,
        // 要移动的资源数量。
        5,
        // 事务上下文。
        tx
    );
    int emeraldsMoved = ResourceHandlerUtil.moveStacking(
        emeralds, apples, emeraldResource::equals, 1, tx
    );;

    // 执行任何必要验证。
    if (applesMoved == 5 && emeraldsMoved == 1) {
        // 把事务标记为完成。
        tx.commit();
    }
}
```

:::

如果多个 `Transaction` 同时发生，可以通过 `Transaction#open` 在一个 `Transaction` 中创建子 `Transaction`。

```java
// 打开事务。
try (Transaction tx = Transaction.openRoot()) {
    // 事务 A
    try (Transaction atx = Transaction.open(tx)) {
        // 从资源处理器插入和提取。

        // ...

        // 标记为完成。
        atx.commit();
    }

    // 事务 B
    try (Transaction btx = Transaction.open(tx)) {
        // 从资源处理器插入和提取。

        // ...

        // 这个事务可能无效，因此不标记为完成。
    }

    // 把根事务标记为成功，使成功的内层事务完成。
    tx.commit();
}
```

### 创建快照

单独使用时，`Transaction#commit` 本身不执行任何操作。因此，无论传输是否成功，已执行的插入和提取都会永久生效。我们希望任何 `Transaction` 中的传输都只在调用 `commit` 时生效，否则就回滚。

这正是 `SnapshotJournal<T>` 的用途。顾名思义，它可以在修改处理器内容前，为当前处理器状态创建一个 `T` 类型的“快照”。事务成功后可以释放快照；事务失败时，则可以把处理器恢复到之前的状态。每个 `SnapshotJournal` 至少必须实现两个方法：`createSnapshot` 实际创建保存的状态，`revertToSnapshot` 把处理器恢复到指定状态。如果处理器发生变化时还需要通知或更新目标对象，可以重写 `onRootCommit` 处理这些变化。

所有 NeoForge `ResourceHandler` 实现都以某种方式使用 `SnapshotJournal`，可能直接在处理器上使用，也可能作为内部字段使用。只有创建新的 `ResourceHandler` 时，才需要自行实现 `SnapshotJournal`。

```java
// 由于只需要跟踪一个索引，可以把保存的对象直接作为快照值。
public class ExampleResourceHandler extends SnapshotJournal<ExampleObject> implements ResourceHandler<ExampleResource> {

    private ExampleObject object;

    public ExampleResourceHandler(ExampleObject object) {
        // ...
    }
    
    // ...

    @Override
    protected ExampleObject createSnapshot() {
        // 创建对象快照。
        // 快照应不可变。
        ExampleObject original = this.object;
        this.object = new ExampleObject(
            original.id(), original.count(), ImmutableMap.copyOf(original.flags())
        );
        return original;
    }

    @Override
    protected void revertToSnapshot(ExampleObject snapshot) {
        // 把处理器状态恢复到快照。
        this.object = snapshot;
    }

    // 需要修改 insert 和 extract 方法，
    // 在每次修改内容前创建快照。

    @Override
    public int insert(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 把资源插入给定索引，并返回实际放入的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查资源能否从此位置插入。
        ExampleObject current = this.object;
        if (current.count() == 0 || (current.id() == resource.id() && current.flags().equals(resource.flags()) && this.isValid(index, resource))) {
            // 计算要插入的数量。
            int insertedAmount = Math.min(amount, this.getCapacityAsInt(index, resource) - current.count());

            if (insertedAmount > 0) {
                // 修改内容前为处理器创建快照。
                this.updateSnapshots(transaction);

                // 更新内容。
                if (current.count() == 0) {
                    this.object = new ExampleObject(
                        resource.id(), insertedAmount, new HashMap<>(resource.flags())
                    );
                } else {
                    this.object.setCount(current.count() + insertedAmount);
                }

                // 返回插入的数量。
                return insertedAmount;
            }
        }

        // 如果不匹配，则不插入。
        return 0;
    }

    @Override
    public int extract(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 从给定索引提取内容，并返回实际取出的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查资源能否从此位置提取。
        ExampleObject current = this.object;
        if (current.id() == resource.id() && current.flags().equals(resource.flags())) {
            // 计算要提取的数量。
            int extracted = Math.min(current.count(), amount);

            if (extracted > 0) {
                // 修改内容前为处理器创建快照。
                this.updateSnapshots(transaction);

                // 更新内容。
                this.object.setCount(current.count() - extracted);

                // 返回提取的数量。
                return extracted;
            }
        }

        // 如果不匹配，则不提取。
        return 0;
    }
}
```

完成这些修改后，事务也能正确处理物品栏状态：

```java
// 假设有两个 `ResourceHandler<ExampleResource>`：exampleA 和 exampleB。

// 打开事务。
try (Transaction tx = Transaction.openRoot()) {
    // 从资源处理器插入和提取
    ExampleResource resource = new ExampleResource(new ExampleObject(0, 1, Map.of()));

    // 尝试提取并插入所需资源
    if (exampleA.extract(resource, 1, tx) == 1 && exampleB.insert(resource, 1, tx) == 1) {
        // 如果成功，就提交事务，使更改永久生效。
        tx.commit();
    }

    // 否则事务会中止，两个处理器会恢复事务发生前的内容。
}
```

[capabilities]: capabilities.md
[container]: container.md
[datacomponent]: ../items/datacomponents.md
[handler]: #resource-handlers
[items]: ../items/index.md
[itemstack]: ../items/index.md#itemstacks
[livingentity]: ../entities/livingentity.md
[playerinv]: container.md#containers-on-players-player-inventory
[transaction]: #transferring-between-handlers
