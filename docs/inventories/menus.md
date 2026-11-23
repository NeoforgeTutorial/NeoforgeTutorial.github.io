---
sidebar_position: 2
---
# 菜单

菜单是图形用户界面（GUI）的一种后端，负责处理与某个被表示的数据持有者交互时的逻辑。菜单本身不是数据持有者，而是允许用户间接修改数据持有者内部状态的视图。因此，数据持有者不应直接与任何菜单耦合，而应传入数据引用，以便调用和修改。

## `MenuType`

菜单会动态创建和移除，因此不是注册表对象。系统改为注册另一个工厂对象，以便创建菜单并引用其*类型*。菜单对应的工厂对象是 `MenuType`。

`MenuType` 必须[注册]。

### `MenuSupplier`

创建 `MenuType` 时，需要向构造器传入 `MenuSupplier` 和 `FeatureFlagSet`。`MenuSupplier` 表示一个函数，接收容器 ID 和查看菜单的玩家物品栏，并返回新建的 [`AbstractContainerMenu`][acm]。

```java
// 某个 DeferredRegister<MenuType<?>> REGISTER
public static final Supplier<MenuType<MyMenu>> MY_MENU = REGISTER.register("my_menu", () -> new MenuType<>(MyMenu::new, FeatureFlags.DEFAULT_FLAGS));

// 在 AbstractContainerMenu 的子类 MyMenu 中
public MyMenu(int containerId, Inventory playerInv) {
    super(MY_MENU.get(), containerId);
    // ...
}
```

:::note
容器标识符对单个玩家是唯一的。也就是说，即使两个玩家查看同一个数据持有者，同一个容器 ID 在他们那里也代表两个不同的菜单。
:::

`MenuSupplier` 通常负责在客户端创建菜单，并提供占位数据引用，用于保存和操作从服务端数据持有者同步来的信息。

### `IContainerFactory`

如果客户端需要额外信息（例如数据持有者在世界中的位置），可以改用其子类 `IContainerFactory`。除了容器 ID 和玩家物品栏，它还会提供一个 `RegistryFriendlyByteBuf`，其中保存服务端发送的额外信息。可以通过 `IMenuTypeExtension#create` 使用 `IContainerFactory` 创建 `MenuType`。

```java
// 某个 DeferredRegister<MenuType<?>> REGISTER
public static final Supplier<MenuType<MyMenuExtra>> MY_MENU_EXTRA = REGISTER.register("my_menu_extra", () -> IMenuTypeExtension.create(MyMenu::new));

// 在 AbstractContainerMenu 的子类 MyMenuExtra 中
public MyMenuExtra(int containerId, Inventory playerInv, FriendlyByteBuf extraData) {
    super(MY_MENU_EXTRA.get(), containerId);
    // 从缓冲区保存额外数据
    // ...
}
```

## `AbstractContainerMenu`

所有菜单都继承 `AbstractContainerMenu`。菜单构造时接收两个参数：表示菜单自身类型的 [`MenuType`][mt]，以及表示当前访问者所使用菜单唯一标识符的容器 ID。

:::note
菜单标识符会在 0-99 之间循环，每当玩家打开菜单时递增。
:::

每个菜单都应包含两个构造器：一个用于在服务端初始化菜单，另一个用于在客户端初始化菜单。提供给 `MenuType` 的是客户端初始化构造器。服务端菜单构造器中包含的任何字段，都应在客户端菜单构造器中有某种默认值。

```java
// 客户端菜单构造器
public MyMenu(int containerId, Inventory playerInventory) { // 如果要从服务端读取数据，可添加可选的 FriendlyByteBuf 参数
    this(containerId, playerInventory, /* 任意默认参数 */);
}

// 服务端菜单构造器
public MyMenu(int containerId, Inventory playerInventory, /* 任意额外参数。 */) {
    // ...
}
```

:::note
如果菜单不需要显示额外数据，则只需要一个构造器。
:::

每个菜单实现都必须实现两个方法：`#stillValid` 和 [`#quickMoveStack`][qms]。

### `#stillValid` 与 `ContainerLevelAccess`

`#stillValid` 决定菜单是否应继续为给定玩家保持打开。通常会把工作交给静态 `#stillValid`，它接收 `ContainerLevelAccess`、玩家以及菜单所附加的 `Block`。客户端菜单的此方法必须始终返回 `true`，而静态 `#stillValid` 默认也如此。该实现会检查玩家是否位于数据存储对象所在位置八个方块范围内。

`ContainerLevelAccess` 在封闭作用域内提供当前关卡和方块位置。在服务端构造菜单时，可以调用 `ContainerLevelAccess#create` 创建访问对象。客户端菜单构造器可以传入 `ContainerLevelAccess#NULL`，它不会执行任何操作。

```java
// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, ContainerLevelAccess.NULL);
}

// 服务端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, ContainerLevelAccess access) {
    // ...
}

// 假设此菜单附加到 Supplier<Block> MY_BLOCK
@Override
public boolean stillValid(Player player) {
    return AbstractContainerMenu.stillValid(this.access, player, MY_BLOCK.get());
}
```

### 数据同步

有些数据需要同时存在于服务端和客户端，才能显示给玩家。为此，菜单实现了一层基本的数据同步：当当前数据与上次同步到客户端的数据不一致时进行更新。对于玩家而言，每个 tick 都会检查一次。

Minecraft 默认支持两种数据同步：通过 `Slot` 同步 [`ItemStack`][itemstack]，以及通过 `DataSlot` 同步整数。`Slot` 和 `DataSlot` 都是视图，持有对数据存储的引用；只要操作有效，玩家就可以在屏幕中通过它们修改数据。每种数据同步方式都会给服务端菜单构造器增加一个参数，而客户端会创建一个占位实例，用于写入服务端发送的数据。

#### `DataSlot`

`DataSlot` 是一个抽象类，应实现 getter 和 setter，以引用数据存储对象中的数据。客户端菜单构造器应始终通过 `DataSlot#standalone` 提供一个新实例。随后可以使用 `#addDataSlot` 把数据槽添加到菜单中。

这些数据槽与物品槽一样，都应在每次初始化新菜单时重新创建。

:::note
虽然 `DataSlot` 保存整数，但由于网络传输方式，它实际上被限制在 **short** 范围（-32768 到 32767）。整数的高 16 位会被忽略。

NeoForge 修改了数据包，使客户端可以取得完整整数。
:::

```java
// 假设每次初始化服务端菜单时都会构造一个 DataSlot

// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(
        containerId, playerInventory,
        // 传入一个占位槽，用于接收服务端同步的值
        DataSlot.standalone()
    );
}

// 服务端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, DataSlot dataSingle) {
    // 为要处理的整数添加数据槽
    this.addDataSlot(dataSingle);

    // ...
}
```

#### `ContainerData`

如果需要向客户端同步多个整数，可以使用 `ContainerData` 引用这些整数。该接口以索引查找方式工作，每个索引代表一个不同整数。如果通过 `#addDataSlots` 把 `ContainerData` 添加到菜单，它也可以直接在数据对象中构造。该方法会根据接口指定的数据量创建新的 `DataSlot`。客户端菜单构造器应始终通过 `SimpleContainerData` 提供新实例。

```java
// 假设有一个大小为 3 的 ContainerData

// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, new SimpleContainerData(3));
}

// 服务端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, ContainerData dataMultiple) {
    // 检查 ContainerData 大小是否为某个固定值
    checkContainerDataCount(dataMultiple, 3);

    // 为要处理的整数添加数据槽
    this.addDataSlots(dataMultiple);

    // ...
}
```

#### `Slot`

`Slot` 表示物品栏中某个 [`ItemStack`][itemstack] 的引用。每个 `Slot` 至少有四个参数：物品堆栈所在的物品栏、该槽位具体表示的物品堆栈索引，以及槽位左上角相对于 `AbstractContainerScreen#leftPos` 和 `#topPos` 在屏幕上渲染的 x、y 坐标。其他参数通常为槽位提供上下文，以处理特殊行为，例如只接收燃料物品，或禁止取出物品。

服务端菜单构造器应接收物品栏实例或视图。客户端菜单构造器则应始终提供一个相同大小、内容为空的物品栏实例，用于写入服务端数据。随后可以使用 `#addSlot` 把所需 `Slot` 或其子类添加到菜单。

对于 [`Container`][container]，客户端菜单通常传入 `SimpleContainer`，并使用普通 `Slot` 添加。对于 [`ResourceHandler<ItemResource>` 能力][cap]，客户端菜单通常传入 `ItemStacksResourceHandler`，并使用 `ResourceHandlerSlot` 添加。

大多数情况下，菜单会先添加自身包含的槽位，再添加玩家物品栏，最后添加玩家快捷栏。要从菜单访问某个 `Slot`，必须根据槽位添加顺序计算索引。

```java
// 假设有一个大小为 10、来自数据对象的物品栏

// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, new ItemStacksResourceHandler(10));
}

// 服务端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, StacksResourceHandler<ItemStack, ItemResource> dataInventory) {
    // 检查数据物品栏大小是否为某个固定值
    int dataSize = dataInventory.getSlots();
    if (dataSize < 10) {
        throw new IllegalArgumentException("Container size " + dataSize + " is smaller than expected " + 5);
    }

    // 然后为数据物品栏添加槽位
    // 如果使用 Slot 子类，请确保服务端用到的数据
    // 在客户端也可用。

    // 遍历各个位置并添加槽位，
    // 从而创建物品栏界面。

    // 两行
    for (int j = 0; j < 2; j++) {
        // 五列
        for (int i = 0; i < 5; i++) {
            // 为数据物品栏中的每个槽位添加槽位
            this.addSlot(new ResourceHandlerSlot(
                // 物品栏
                dataInventory,
                // 用于修改已存资源索引的索引修改器
                dataInventory::set,
                // 此槽位表示的数据物品栏索引：
                // 行索引 * 列数 + 列索引
                j * 5 + i,
                // 相对于 leftPos 的 x 坐标
                // 原版槽位默认大小为 18 单位
                // startX + 列索引 * slotRenderWidth
                44 + i * 18,
                // 相对于 topPos 的 y 坐标
                // 原版槽位默认大小为 18 单位
                // startY + 行索引 * slotRenderHeight
                20 + j * 18
            ))
        }
    }

    // 为玩家物品栏添加槽位（全部 27 个槽位 + 9 个快捷栏槽位）
    // 如果要把 9x3 + 9 的网格改成其他布局，
    // 可以像上面一样遍历添加
    this.addStandardInventorySlots(
        playerInventory,
        // 相对于 leftPos 的起始 x 坐标
        8,
        // 相对于 topPos 的起始 y 坐标
        84
    );

    // ...
}
```

#### `#quickMoveStack`

`#quickMoveStack` 是任何菜单都必须实现的第二个方法。当某个堆栈被 Shift 点击（快速移动）时，就会调用该方法，直到堆栈完全移出原槽位，或没有其他地方可以放置为止。该方法返回被快速移动槽位中堆栈的副本。

堆栈通常通过 `#moveItemStackTo` 在槽位之间移动，它会把堆栈移动到第一个可用槽位。该方法接收要移动的堆栈、尝试移动到的第一个槽位索引（含）、最后一个槽位索引（不含），以及检查槽位的方向：`false` 表示从第一个到最后一个，`true` 表示从最后一个到第一个。

在 Minecraft 的各实现中，该方法的逻辑相当一致：

```java
// 假设有一个大小为 5 的数据物品栏
// 该物品栏有 4 个输入槽（索引 1 - 4），并输出到一个结果槽（索引 0）
// 还有 27 个玩家物品栏槽位和 9 个快捷栏槽位
// 因此实际槽位索引如下：
//   - 数据物品栏：结果（0），输入（1 - 4）
//   - 玩家物品栏（5 - 31）
//   - 玩家快捷栏（32 - 40）
@Override
public ItemStack quickMoveStack(Player player, int quickMovedSlotIndex) {
    // 被快速移动槽位中的堆栈
    ItemStack quickMovedStack = ItemStack.EMPTY;
    // 被快速移动的槽位
    Slot quickMovedSlot = this.slots.get(quickMovedSlotIndex);
  
    // 如果槽位在有效范围内且不为空
    if (quickMovedSlot != null && quickMovedSlot.hasItem()) {
        // 取得要移动的原始堆栈
        ItemStack rawStack = quickMovedSlot.getItem(); 
        // 把要返回的堆栈设为原始堆栈的副本
        quickMovedStack = rawStack.copy();

        /*
        对于不能转换数据的容器（例如箱子），下面的快速移动逻辑可以简化为：
        如果在数据物品栏中，就尝试移动到玩家物品栏/快捷栏；反过来也一样。
        */

        // 如果快速移动发生在数据物品栏的结果槽
        if (quickMovedSlotIndex == 0) {
            // 尝试把结果槽移动到玩家物品栏/快捷栏
            if (!this.moveItemStackTo(rawStack, 5, 41, true)) {
                // 如果无法移动，就停止快速移动
                return ItemStack.EMPTY;
            }

            // 执行结果槽快速移动后的逻辑
            quickMovedSlot.onQuickCraft(rawStack, quickMovedStack);
        }
        // 否则，如果快速移动发生在玩家物品栏或快捷栏槽位
        else if (quickMovedSlotIndex >= 5 && quickMovedSlotIndex < 41) {
            // 尝试把物品栏/快捷栏槽位移动到数据物品栏输入槽
            if (!this.moveItemStackTo(rawStack, 1, 5, false)) {
                // 如果无法移动，并且当前是玩家物品栏槽位，就尝试移动到快捷栏
                if (quickMovedSlotIndex < 32) {
                    if (!this.moveItemStackTo(rawStack, 32, 41, false)) {
                        // 如果无法移动，就停止快速移动
                        return ItemStack.EMPTY;
                    }
                }
                // 否则尝试把快捷栏物品移动到玩家物品栏槽位
                else if (!this.moveItemStackTo(rawStack, 5, 32, false)) {
                    // 如果无法移动，就停止快速移动
                    return ItemStack.EMPTY;
                }
            }
        }
        // 否则，如果快速移动发生在数据物品栏输入槽，就尝试移动到玩家物品栏/快捷栏
        else if (!this.moveItemStackTo(rawStack, 5, 41, false)) {
            // 如果无法移动，就停止快速移动
            return ItemStack.EMPTY;
        }

        if (rawStack.isEmpty()) {
            // 如果原始堆栈已完全移出槽位，就把槽位设为空堆栈
            quickMovedSlot.setByPlayer(ItemStack.EMPTY);
        } else {
            // 否则通知槽位堆栈数量发生了变化
            quickMovedSlot.setChanged();
        }

        // 对剩余堆栈执行移动后的逻辑
        // 如果没有重写 `onTake` 的 `Slot` 子类，可以删除此项
        quickMovedSlot.onTake(player, rawStack);
    }

    return quickMovedStack; // 返回槽位中的堆栈
}
```

## 打开菜单

注册菜单类型、完成菜单本身并附加[屏幕]后，玩家就可以打开菜单。可以在逻辑服务端调用 `IPlayerExtension#openMenu` 打开菜单。该方法接收服务端菜单的 `MenuProvider`；如果需要向客户端同步额外数据，还可以选择接收一个 `Consumer<RegistryFriendlyByteBuf>`。

:::note
带 `Consumer<RegistryFriendlyByteBuf>` 参数的 `IPlayerExtension#openMenu` 只应在使用 [`IContainerFactory`][icf] 创建菜单类型时使用。
:::

#### `MenuProvider`

`MenuProvider` 是一个接口，包含两个方法：`#createMenu` 创建服务端菜单实例，`#getDisplayName` 返回包含菜单标题的组件，以便传给[屏幕]。`#createMenu` 方法包含三个参数：菜单的容器 ID、打开菜单的玩家物品栏，以及打开菜单的玩家。

使用 `SimpleMenuProvider` 可以轻松创建 `MenuProvider`，它接收用于创建服务端菜单的方法引用和菜单标题。

```java
// 在某个可以访问逻辑服务端 Player 的实现中（例如 ServerPlayer 实例）
// 假设有 ServerPlayer serverPlayer
serverPlayer.openMenu(new SimpleMenuProvider(
    (containerId, playerInventory, player) -> new MyMenu(containerId, playerInventory, /* 服务端参数 */),
    Component.translatable("menu.title.examplemod.mymenu")
));
```

### 常见实现

菜单通常在玩家进行某种交互时打开，例如右击方块或实体。

#### 方块实现

方块通常通过重写 `BlockBehaviour#useWithoutItem` 实现菜单，并为该[交互]返回 `InteractionResult#SUCCESS`。

应重写 `BlockBehaviour#getMenuProvider` 实现 `MenuProvider`。原版方法使用它在旁观模式下查看菜单。

```java
// 在某个 Block 子类中
@Override
public MenuProvider getMenuProvider(BlockState state, Level level, BlockPos pos) {
    return new SimpleMenuProvider(/* ... */);
}

@Override
public InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult result) {
    if (!level.isClientSide() && player instanceof ServerPlayer serverPlayer) {
        serverPlayer.openMenu(state.getMenuProvider(level, pos));
    }

    return InteractionResult.SUCCESS;
}
```

:::note
这是实现该逻辑最简单的方式，但不是唯一方式。如果只想在特定条件下打开菜单，需要提前向客户端同步一些数据，以便条件不满足时返回 `InteractionResult#PASS` 或 `#FAIL`。
:::

#### 生物实现

生物通常通过重写 `Mob#mobInteract` 实现菜单。做法与方块实现类似，唯一区别是 `Mob` 自身应实现 `MenuProvider`，以支持旁观模式查看。

```java
public class MyMob extends Mob implements MenuProvider {
    // ...

    @Override
    public InteractionResult mobInteract(Player player, InteractionHand hand) {
        if (!this.level.isClientSide() && player instanceof ServerPlayer serverPlayer) {
            serverPlayer.openMenu(this);
        }

        return InteractionResult.SUCCESS;
    }
}
```

:::note
这同样只是实现该逻辑的最简单方式，不是唯一方式。
:::

[registered]: ../concepts/registries.md#methods-for-registering
[acm]: #abstractcontainermenu
[mt]: #menutype
[qms]: #quickmovestack
[cap]: capabilities.md#neoforge-provided-capabilities
[container]: container.md
[screen]: ../rendering/screens.md
[icf]: #icontainerfactory
[side]: ../concepts/sides.md#the-logical-side
[interaction]: ../items/interactions.md#right-clicking-an-item
[itemstack]: ../items/index.md#itemstacks
