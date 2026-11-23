---
sidebar_position: 0
---
# 容器

[方块实体][blockentity]的一个常见用途是保存某种物品。Minecraft 中一些最基础的[方块][block]，例如熔炉和箱子，就使用方块实体来保存物品。要在某个对象上保存物品，Minecraft 使用 `Container`。

`Container` 接口定义了 `#getItem`、`#setItem` 和 `#removeItem` 等方法，用于查询和更新容器。由于它只是一个接口，实际目标列表或其他数据结构由实现它的系统提供。

因此，`Container` 不仅可以由方块实体实现，也可以由任何其他类实现。常见例子包括实体物品栏，以及背包等模组中常见的[物品][item]。

:::warning
NeoForge 在许多场景中提供 `ItemStacksResourceHandler` 类来替代 `Container`。只要可行，就应优先使用它，因为它能与其他 `Container` / `ItemStacksResourceHandler` 进行更清晰的交互。

本文主要是为参考原版代码，或为需要在多个加载器上开发模组时提供说明。自己的代码中请尽可能使用 `ItemStacksResourceHandler`。相关文档仍在编写中。
:::

## 基本容器实现

只要满足接口规定的方法，就可以用任意方式实现容器（与 Java 中的其他接口一样）。不过，通常使用固定长度的 `NonNullList<ItemStack>` 作为目标结构；单槽容器也可以直接使用 `ItemStack` 字段。

例如，一个具有 27 个槽位（一个箱子）的基本 `Container` 实现可以如下：

```java
public class MyContainer implements Container {
    private final NonNullList<ItemStack> items = NonNullList.withSize(
            // 列表大小，即容器中的槽位数量。
            27,
            // 代替普通列表中 null 的默认值。
            ItemStack.EMPTY
    );

    // 容器中的槽位数量。
    @Override
    public int getContainerSize() {
        return 27;
    }

    // 容器是否应被视为空。
    @Override
    public boolean isEmpty() {
        return this.items.stream().allMatch(ItemStack::isEmpty);
    }

    // 返回指定槽位中的物品堆栈。
    @Override
    public ItemStack getItem(int slot) {
        return this.items.get(slot);
    }

    // 从指定槽位移除指定数量的物品，并返回刚移除的堆栈。
    // 这里交给 ContainerHelper 按预期处理，
    // 但必须手动调用 #setChanged。
    @Override
    public ItemStack removeItem(int slot, int amount) {
        ItemStack stack = ContainerHelper.removeItem(this.items, slot, amount);
        this.setChanged();
        return stack;
    }

    // 从指定槽位移除全部物品，并返回刚移除的堆栈。
    // 这里同样交给 ContainerHelper 处理，也必须手动调用 #setChanged。
    @Override
    public ItemStack removeItemNoUpdate(int slot) {
        ItemStack stack = ContainerHelper.takeItem(this.items, slot);
        this.setChanged();
        return stack;
    }

    // 把给定物品堆栈放入指定槽位，并先限制为容器的最大堆叠数量。
    @Override
    public void setItem(int slot, ItemStack stack) {
        stack.limitSize(this.getMaxStackSize(stack));
        this.items.set(slot, stack);
        this.setChanged();
    }

    // 容器内容发生变化，也就是添加、修改或移除物品堆栈时调用。
    // 例如，可以在这里调用 BlockEntity#setChanged。
    @Override
    public void setChanged() {

    }

    // 对给定玩家而言，容器是否仍为“有效”。例如，箱子及类似方块
    // 会在这里检查玩家是否仍在方块的指定距离内。
    @Override
    public boolean stillValid(Player player) {
        return true;
    }

    // 清空内部存储，把所有槽位重新设为空。
    @Override
    public void clearContent() {
        items.clear();
        this.setChanged();
    }
}
```

### `SimpleContainer`

`SimpleContainer` 类是一个基本容器实现，并附带了一些额外便利功能。如果不需要特殊的容器行为，可以使用它。

### `BaseContainerBlockEntity`

`BaseContainerBlockEntity` 是 Minecraft 中许多重要方块实体的基类，例如箱子及类似方块、各种熔炉、漏斗、发射器、投掷器、酿造台等。

除了 `Container`，它还实现 `MenuProvider` 和 `Nameable` 接口：

- `Nameable` 定义了一些与设置（自定义）名称有关的方法。除了许多方块实体，`Entity` 等类也实现此接口。它使用 [`Component` 系统][component]。
- `MenuProvider` 定义 `#createMenu` 方法，允许从容器构造 [`AbstractContainerMenu`][menu]。因此，如果不需要关联 GUI，例如点唱机，就不适合使用此类。

`BaseContainerBlockEntity` 通过 `#getItems` 和 `#setItems` 两个方法封装了通常会对 `NonNullList<ItemStack>` 执行的所有调用，大幅减少样板代码。一个 `BaseContainerBlockEntity` 示例实现如下：

```java
public class MyBlockEntity extends BaseContainerBlockEntity {
    // 容器大小。当然可以是任意所需值。
    public static final int SIZE = 9;
    // 物品堆栈列表。因为存在 #setItems，所以不是 final。
    private NonNullList<ItemStack> items = NonNullList.withSize(SIZE, ItemStack.EMPTY);

    // 构造器，与之前相同。
    public MyBlockEntity(BlockPos pos, BlockState blockState) {
        super(MY_BLOCK_ENTITY.get(), pos, blockState);
    }

    // 容器大小，与之前相同。
    @Override
    public int getContainerSize() {
        return SIZE;
    }

    // 物品堆栈列表的 getter。
    @Override
    protected NonNullList<ItemStack> getItems() {
        return items;
    }

    // 物品堆栈列表的 setter。
    @Override
    protected void setItems(NonNullList<ItemStack> items) {
        this.items = items;
    }

    // 菜单的显示名称。别忘了添加翻译！
    @Override
    protected Component getDefaultName() {
        return Component.translatable("container.examplemod.myblockentity");
    }

    // 从该容器创建的菜单。返回值见下文。
    @Override
    protected AbstractContainerMenu createMenu(int containerId, Inventory inventory) {
        return null;
    }
}
```

请记住，该类同时是 `BlockEntity` 和 `Container`。可以把该类作为方块实体的父类，从而直接得到一个可工作且预实现容器的方块实体。

:::note
实现 `Container` 的 `BlockEntity` 默认会处理内容掉落。如果选择不实现 `Container`，就需要自行处理[移除逻辑][beremove]。
:::

### `WorldlyContainer`

`WorldlyContainer` 是 `Container` 的子接口，允许按 `Direction` 访问给定 `Container` 的槽位。它主要用于只向特定方向暴露部分容器的方块实体。例如，一台机器可以从一侧输出，并从其他所有侧接收输入，或反过来。该接口的简单实现如下：

```java
// 见上面的 BaseContainerBlockEntity 方法。当然也可以直接继承 BlockEntity
// 并在需要时自行实现 Container。
public class MyBlockEntity extends BaseContainerBlockEntity implements WorldlyContainer {
    // 其他内容
    
    // 假设槽位 0 是输出，槽位 1-8 是输入。
    // 再假设我们向上方输出，并从其他所有方向接收输入。
    private static final int[] OUTPUTS = new int[]{0};
    private static final int[] INPUTS = new int[]{1, 2, 3, 4, 5, 6, 7, 8};

    // 根据传入的 Direction 返回暴露的槽位索引数组。
    @Override
    public int[] getSlotsForFace(Direction side) {
        return side == Direction.UP ? OUTPUTS : INPUTS;
    }

    // 是否可以通过给定方向把物品放入指定槽位。
    // 本示例仅在不是从上方输入且索引位于 [1, 8] 时返回 true。
    @Override
    public boolean canPlaceItemThroughFace(int index, ItemStack itemStack, @Nullable Direction direction) {
        return direction != Direction.UP && index > 0 && index < 9;
    }

    // 是否可以从给定方向和给定槽位取出物品。
    // 本示例仅在从上方取出且槽位索引为 0 时返回 true。
    @Override
    public boolean canTakeItemThroughFace(int index, ItemStack stack, Direction direction) {
        return direction == Direction.UP && index == 0;
    }
}
```

## 使用容器

创建容器后，就可以使用它们。

由于 `Container` 和 `BlockEntity` 存在大量重合，最好在方块实体能够转换为 `Container` 时直接转换取得容器：

```java
if (blockEntity instanceof Container container) {
    // 对容器执行操作
}
```

随后可以使用前面提到的方法，例如：

```java
// 取得容器中的第一个物品。
ItemStack stack = container.getItem(0);

// 把容器中的第一个物品设为泥土。
container.setItem(0, new ItemStack(Items.DIRT));

// 从第三个槽位移除最多 16 个物品。
container.removeItem(2, 16);
```

:::warning
如果访问超出容器大小的槽位，容器可能抛出异常；也可能返回 `ItemStack.EMPTY`，例如 `SimpleContainer` 就是如此。
:::

### `ContainerUser`

能够访问容器的生物实体实现 `ContainerUser`。每个 user 定义自己是否打开了容器，以及实体能够与容器交互的最大方块距离。当容器对象被交互时（例如右击箱子），`Container` 会用该 `ContainerUser` 调用 `startOpen`；容器对象关闭后（例如离开箱子菜单），则调用 `stopOpen`。

这些方法通常通过 `ContainerOpenersCounter` 跟踪打开容器的生物实体数量，某些实体 AI 和渲染会使用该计数。

## `ItemStack` 上的 `Container`

到目前为止，主要讨论的是 `BlockEntity` 上的 `Container`。不过，也可以使用 `minecraft:container` [数据组件][datacomponent]把容器应用到 [`ItemStack`][itemstack]：

```java
// 这里用 SimpleContainer 作为父类，避免自行重新实现物品处理逻辑。
// 由于 SimpleContainer 的实现细节，如果多方同时访问该容器，可能出现竞态条件，
// 所以这里直接假设我们的模组不允许这种情况。
// 当然，也可以在需要时使用其他 Container 实现，或自行实现 Container。
public class MyBackpackContainer extends SimpleContainer {
    // 此容器对应的物品堆栈，在构造器中传入并保存。
    private final ItemStack stack;
    
    public MyBackpackContainer(ItemStack stack) {
        // 使用所需容器大小调用父类构造器。
        super(27);
        // 设置 stack 字段。
        this.stack = stack;
        // 从数据组件（如果存在）加载容器内容。数据由 ItemContainerContents 表示；
        // 不存在时使用 ItemContainerContents.EMPTY。
        ItemContainerContents contents = stack.getOrDefault(DataComponents.CONTAINER, ItemContainerContents.EMPTY);
        // 把数据组件内容复制到物品堆栈列表。
        contents.copyInto(this.getItems());
    }

    // 内容变化时，把数据组件重新保存到物品堆栈。
    @Override
    public void setChanged() {
        super.setChanged();
        this.stack.set(DataComponents.CONTAINER, ItemContainerContents.fromItems(this.getItems()));
    }
}
```

这样便创建了由物品支持内容的容器。可以调用 `new MyBackpackContainer(stack)` 为菜单或其他用途创建容器。

:::warning
直接与 `Container` 交互的菜单在修改物品堆栈时必须调用 `#copy()`，否则会破坏数据组件的不可变性约定。为此，NeoForge 提供了 `StackCopySlot` 类。
:::

## `Entity` 上的 `Container` {#containers-on-entitys}

[`Entity`][entity]上的 `Container` 比较麻烦：无法通用地判断某个实体是否具有容器，具体取决于正在处理的实体，可能需要大量特殊处理。

如果自行创建实体，可以直接在实体上实现 `Container`。但要注意，此时无法使用 `SimpleContainer` 等父类，因为 `Entity` 已经是父类。

### `Mob` 上的 `Container`

`Mob` 不实现 `Container`，但实现了 `EquipmentUser` 等接口。该接口定义 `#setItemSlot(EquipmentSlot, ItemStack)`、`#getItemBySlot(EquipmentSlot)` 和 `#setDropChance(EquipmentSlot, float)` 方法。虽然在代码层面与 `Container` 无关，但功能十分相似：它们把槽位（这里是装备槽）与 `ItemStack` 关联起来。

与 `Container` 最明显的区别是没有类似列表的顺序（尽管 `Mob` 内部仍然使用 `NonNullList<ItemStack>`）。访问方式不是槽位索引，而是七个 `EquipmentSlot` 枚举值：`MAINHAND`、`OFFHAND`、`FEET`、`LEGS`、`CHEST`、`HEAD` 和 `BODY`，其中 `BODY` 用于马和狼的盔甲。

与生物“槽位”交互的示例如下：

```java
// 取得 HEAD（头盔）槽位中的物品堆栈。
ItemStack helmet = mob.getItemBySlot(EquipmentSlot.HEAD);

// 把基岩放入生物的 FEET（靴子）槽位。
mob.setItemSlot(EquipmentSlot.FEET, new ItemStack(Items.BEDROCK));

// 让该基岩在生物被杀死时必定掉落。
mob.setDropChance(EquipmentSlot.FEET, 1f);
```

### `InventoryCarrier`

`InventoryCarrier` 是由村民等部分生物实体实现的接口。它声明 `#getInventory` 方法，返回 `SimpleContainer`。不需要装备槽、而需要实际物品栏的非玩家实体可以使用此接口。

### `Player` 上的 `Container`（玩家物品栏） {#containers-on-players-player-inventory}

玩家物品栏由 `Inventory` 类实现。该类实现 `Container`，也实现前面提到的 `Nameable` 接口。`Player` 中有一个名为 `inventory` 的字段保存其 `Inventory` 实例，可以通过 `Player#getInventory` 访问。玩家物品栏可以像其他容器一样交互。

物品栏内容保存在两个位置：

- `NonNullList<ItemStack> items` 列表包含 36 个主物品栏槽位，其中包括九个快捷栏槽位（索引 0-8）。
- `EntityEquipment equipment` 映射保存 `EquipmentSlot` 堆栈，依次包括盔甲槽（`FEET`、`LEGS`、`CHEST`、`HEAD`）、`OFFHAND`、`BODY` 和 `SADDLE`。

遍历物品栏内容时，建议先遍历 `items`，再使用 `Inventory#EQUIPMENT_SLOT_MAPPING` 映射索引并遍历 `equipment`。

[beremove]: ../blockentities/index.md#removing-block-entities
[block]: ../blocks/index.md
[blockentity]: ../blockentities/index.md
[component]: ../resources/client/i18n.md#components
[datacomponent]: ../items/datacomponents.md
[entity]: ../entities/index.md
[item]: ../items/index.md
[itemstack]: ../items/index.md#itemstacks
[menu]: menus.md
