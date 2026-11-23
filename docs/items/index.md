# 物品

物品和方块一样，是 Minecraft 的重要组成部分。方块构成周围的世界，物品则存在于物品栏中。

## 物品究竟是什么？

进一步创建物品之前，需要理解物品到底是什么，以及它与[方块][block]有什么区别。下面以泥土为例：

- 在世界中遇到泥土方块并想挖掘它。这是**方块**，因为它放置在世界中。（严格来说，它不是方块，而是方块状态。详见[方块状态文章][blockstates]。）
    - 并非所有方块被破坏时都会掉落自身（例如树叶）。更多信息见[战利品表][loottables]文章。
- [挖掘方块][breaking]后，方块被移除（即替换为空气），泥土掉落。掉落的泥土是一个物品**[实体][entity]**。这意味着和其他实体（猪、僵尸、箭等）一样，它会被水流推动，也会被火焰和熔岩烧毁。
- 拾取泥土物品实体后，它会变成物品栏中的**物品堆**。简单来说，物品堆是带有额外信息（例如堆叠数量）的物品实例。
- 物品堆由对应的**物品**支持（也就是这里要创建的内容）。物品保存[数据组件][datacomponents]，其中包含所有物品堆初始化时使用的默认信息（例如每把铁剑最大耐久为 250）；物品堆可以修改这些数据组件，使同一物品的两个物品堆拥有不同信息（例如一把铁剑还剩 100 次使用，另一把还剩 200 次）。关于何时通过物品、何时通过物品堆处理数据，见下文。
    - 物品和物品堆的关系大致类似于[方块][block]和[方块状态][blockstates]：方块状态始终由方块支持。这个类比并不完全准确（例如物品堆不是单例），但有助于建立基本概念。

## 创建物品

理解物品是什么之后，开始创建物品。

与基础方块类似，不需要特殊功能的基础物品（例如木棍、糖等）可以直接使用 `Item` 类。注册时用 `Item.Properties` 参数实例化 `Item`。`Item.Properties` 可以通过 `Item.Properties#of` 创建，并可调用以下方法进行配置：

- `setId`：设置物品资源键。
    - 每个物品都**必须**设置，否则会抛出异常。
- `overrideDescription`：设置物品翻译键。生成的 `Component` 保存在 `DataComponents#ITEM_NAME`。
- `useBlockDescriptionPrefix`：便捷方法，使用 `block.<modid>.<registry_name>` 翻译键调用 `overrideDescription`。所有 `BlockItem` 都应调用它。
- `requiredFeatures`：设置物品所需的功能标志，主要用于原版次版本中的功能锁定。除非要与原版受功能标志锁定的系统集成，否则不建议使用。
- `stacksTo`：通过 `DataComponents#MAX_STACK_SIZE` 设置最大堆叠数量，默认为 64。末影珍珠等只能堆叠到 16 的物品会使用它。
- `durability`：通过 `DataComponents#MAX_DAMAGE` 设置耐久，并通过 `DataComponents#DAMAGE` 把初始损耗设为 0。默认值为 0，表示“无耐久”。例如铁制工具使用 250。注意，设置耐久会自动把最大堆叠数量锁定为 1。
- `fireResistant`：通过 `DataComponents#FIRE_RESISTANT` 使使用该物品的物品实体免疫火焰和熔岩。多种下界合金物品使用它。
- `rarity`：通过 `DataComponents#RARITY` 设置稀有度。当前它只改变物品颜色。`Rarity` 枚举包含 `COMMON`（白色，默认）、`UNCOMMON`（黄色）、`RARE`（青色）和 `EPIC`（淡紫色）。注意，模组可能添加更多稀有度。
- `setNoCombineRepair`：禁止在砂轮和工作台中合并修复该物品。原版未使用。
- `jukeboxPlayable`：设置放入唱片机时播放的数据包 `JukeboxSong` 资源键。
- `food`：通过 `DataComponents#FOOD` 设置物品的 [`FoodProperties`][food]。

示例或 Minecraft 使用的各种值可参考 `Items` 类。

### 剩余物与冷却时间

物品还可以拥有使用时应用的额外属性，或阻止物品在一段时间内再次使用：

- `craftRemainder`：设置合成剩余物。原版用它让装满的桶在合成后留下空桶。
- `usingConvertsTo`：设置通过 `Item#use`、`IItemExtension#finishUsingItem` 或 `Item#releaseUsing` 完成使用后返回的物品。`ItemStack` 保存在 `DataComponents#USE_REMAINDER` 中。
- `useCooldown`：通过 `DataComponents#USE_COOLDOWN` 设置再次使用物品前所需的秒数。

### 工具与盔甲

某些物品具有[工具][tools]和[盔甲][armor]功能。它们通过一系列物品属性构建，只有部分用途委托给关联类：

- `enchantable`：通过 `DataComponents#ENCHANTABLE` 设置物品堆最大[附魔][enchantment]值，允许物品附魔。
- `repairable`：通过 `DataComponents#REPAIRABLE` 设置可用于修复耐久的物品或标签。物品必须具有耐久组件，且不能有 `DataComponents#UNBREAKABLE`。
- `equippable`：通过 `DataComponents#EQUIPPABLE` 设置物品可装备到的槽位。
- `equippableUnswappable`：与 `equippable` 相同，但禁用通过使用物品按钮（默认右键）快速交换。

更多信息见相应页面。

### 更多功能

直接使用 `Item` 只能创建非常基础的物品。如果需要添加右键交互等功能，就必须创建继承 `Item` 的自定义类。`Item` 提供许多可重写方法；详情参见 `Item` 和 `IItemExtension`。

物品最常见的两个用例是左键和右键。由于这些流程复杂并涉及其他系统，它们单独放在[交互文章][interactions]中说明。

### `DeferredRegister.Items`

所有注册表都使用 `DeferredRegister` 注册内容，物品也不例外。由于添加物品是绝大多数模组的关键功能，NeoForge 提供 `DeferredRegister.Items` 辅助类；它继承 `DeferredRegister<Item>`，并提供一些物品专用辅助方法：

```java
public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(ExampleMod.MOD_ID);

public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerItem(
    "example_item",
    Item::new, // 接收属性的工厂。
    props -> props // 用于转换属性的 unary operator。
);
```

内部会把属性参数应用到所提供的物品工厂（通常是构造方法），并调用 `ITEMS.register("example_item", registryName -> new Item(new Item.Properties().setId(ResourceKey.create(Registries.ITEM, registryName))))`，同时设置属性中的 ID。

如果使用 `Item::new`，可以完全省略工厂，使用 `simple` 变体：

```java
public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerSimpleItem(
    "example_item",
    props -> props // 用于转换属性的 unary operator。
);
```

这与前一个示例完全相同，只是稍短。如果使用 `Item` 子类，则必须使用前一种方法。

这两种方法还有省略 `new Item.Properties()` 参数的重载：

```java
public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerItem("example_item", Item::new);

// 同时省略 Item::new 参数的变体
public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerSimpleItem("example_item");
```

最后还有方块物品的快捷方法。除 `setId` 外，它们还会调用 `useBlockDescriptionPrefix`，把翻译键设置为方块使用的键：

```java
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    "example_block",
    ExampleBlocksClass.EXAMPLE_BLOCK,
    props -> props
);

// 省略属性参数的变体：
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    "example_block",
    ExampleBlocksClass.EXAMPLE_BLOCK
);

// 省略名称参数，改用方块的注册名的变体：
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    // 必须是 `Holder<Block>` 实例
    // DeferredBlock<T> 也可用
    ExampleBlocksClass.EXAMPLE_BLOCK,
    props -> props
);

// 同时省略名称和属性的变体：
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    // 必须是 `Holder<Block>` 实例
    // DeferredBlock<T> 也可用
    ExampleBlocksClass.EXAMPLE_BLOCK
);
```

:::note
如果把方块注册放在单独类中，应在物品类之前加载方块类。
:::

### 资源

注册物品并通过 `/give` 或[创造模式标签页][creativetabs]取得物品后，会发现它缺少正确的模型和贴图。这是因为贴图和模型由 Minecraft 的资源系统处理。

每个物品都需要添加或[生成][datagen]以下 JSON 文件：

- 带有[贴图][texture]的[客户端物品][citems]
- [翻译][i18n]
- [配方][recipes]（可选）
- 一些物品[标签][tags]（可选）

对于上述内容，也可以参考类似原版方块的相应文件和数据生成器。

## `ItemStack` {#itemstacks}

与方块和方块状态类似，大多数预期使用 `Item` 的地方实际使用 `ItemStack`。`ItemStack` 表示容器（例如物品栏）中一个或多个物品组成的堆。方法仍应在 `Item` 中重写、在 `ItemStack` 上调用，许多 `Item` 方法会接收 `ItemStack` 实例。

`ItemStack` 由三个主要部分组成：

- 表示的 `Item`，通过 `ItemStack#getItem` 或 `getItemHolder`（返回 `Holder<Item>`）取得。
- 堆叠数量，通常为 1 到 64，通过 `getCount` 取得，通过 `setCount` 或 `shrink` 修改。
- [数据组件][datacomponents]映射，保存物品堆专属数据。通过 `getComponents` 取得；组件值通常通过 `has`、`get`、`set`、`update` 和 `remove` 访问及修改。

调用 `new ItemStack(Item)` 并传入支持物品即可创建新的 `ItemStack`。默认数量为 1，没有 NBT 数据；也有接收数量和 NBT 数据的构造方法重载。注意，组件绑定前或世界存在前不能创建 `ItemStack`；在此之前应使用下文介绍的 `ItemStackTemplate`。

`ItemStack` 是可变对象（见下文），但有时需要把它视为不可变对象。需要修改本应不可变的物品堆时，可以调用 `#copy` 克隆；如果需要特定数量，则用 `#copyWithCount`。

要表示一个不含物品的堆，使用 `ItemStack.EMPTY`。要检查物品堆是否为空，调用 `#isEmpty`。

### `ItemStack` 的可变性

`ItemStack` 是可变的。调用 `#setCount` 或任何数据组件映射方法都会修改物品堆本身。原版大量利用这种可变性，许多方法也依赖它。例如，`#split` 从调用它的物品堆中分出指定数量，既修改调用者，又返回新的 `ItemStack`。

同时处理多个 `ItemStack` 时，可变性有时会产生问题，最常见于物品栏槽位：既要考虑光标当前选中的 `ItemStack`，也要考虑试图插入或取出的 `ItemStack`。

:::tip
不确定时，宁可安全一些，先对物品堆调用 `#copy`。
:::

## `ItemStackTemplate` {#itemstacktemplates}

`ItemStackTemplate` 是 `ItemStack` 的不可变形式，通常表示不可变上下文（例如配方）中的物品堆。模板包含构成 `ItemStack` 的基本元素：持有的 `Item` holder、堆叠数量，以及以补丁形式保存的物品[数据组件][datacomponents]。

调用某个 `new ItemStackTemplate(...)` 方法并传入 `Item` 及其他所需元素即可创建模板。需要物品堆时，可以通过 `ItemStackTemplate#create` 创建 `ItemStack`。

### JSON 表示

许多场景（例如[配方][recipes]）需要把 `ItemStackTemplate` 表示为 JSON 对象。其表示如下：

```json5
{
    // 物品 ID。必需。
    "id": "minecraft:dirt",
    // 物品堆数量 [1, 99]。可选，默认为 1。
    "count": 4,
    // 数据组件映射。可选，默认为空映射。
    "components": {
        "minecraft:enchantment_glint_override": true
    }
}
```

## `ItemInstance`

`ItemInstance` 是 `ItemStack` 和 `ItemStackTemplate` 实现的父接口。通常二者用于不同上下文；如果物品堆和模板可以互换使用（例如取得堆中物品数量），则会提供 `ItemInstance` 父接口，而不是具体类型。

`ItemInstance` 提供检查 `Item`（`#is`）、堆叠数量（`count`）以及通过 `DataComponentGetter` 读取数据组件的通用方法。

## 创造模式标签页 {#creative-tabs}

默认情况下，物品只能通过 `/give` 获得，不会出现在创造模式物品栏中。下面把它加入创造模式菜单。

添加方式取决于目标标签页。

### 现有创造模式标签页

:::note
此方法用于把物品加入 Minecraft 的标签页或其他模组的标签页。要加入自己的标签页，见下文。
:::

可以通过 `BuildCreativeModeTabContentsEvent` 把物品加入现有 `CreativeModeTab`。该事件只在[逻辑客户端][sides]的[模组事件总线][modbus]上触发。调用 `event#accept` 添加物品。

```java
//MyItemsClass.MY_ITEM 是 Supplier<? extends Item>，MyBlocksClass.MY_BLOCK 是 Supplier<? extends Block>
@SubscribeEvent // 在模组事件总线上
public static void buildContents(BuildCreativeModeTabContentsEvent event) {
    // 当前是否为要添加到的标签页？
    if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
        event.accept(MyItemsClass.MY_ITEM.get());
        // 接收 ItemLike。这里假设 MY_BLOCK 有对应物品。
        event.accept(MyBlocksClass.MY_BLOCK.get());
    }
}
```

事件还提供额外信息，例如通过 `getFlags` 取得启用的功能标志列表，或通过 `hasPermissions` 检查玩家是否有权查看管理员物品标签页。

### 自定义创造模式标签页

`CreativeModeTab` 是注册表，因此自定义标签页必须[注册][registering]。创建标签页使用构建器系统，可通过 `CreativeModeTab#builder` 取得构建器。构建器可设置标题、图标、默认物品及其他属性。NeoForge 还提供额外方法，用于自定义标签页图片、文字和槽位颜色、排序位置等。

```java
//CREATIVE_MODE_TABS 是一个 DeferredRegister<CreativeModeTab>
public static final Supplier<CreativeModeTab> EXAMPLE_TAB = CREATIVE_MODE_TABS.register("example", () -> CreativeModeTab.builder()
    //设置标签页标题。不要忘记添加翻译！
    .title(Component.translatable("itemGroup." + MOD_ID + ".example"))
    //设置标签页图标。
    .icon(() -> new ItemStack(MyItemsClass.EXAMPLE_ITEM.get()))
    //把物品加入标签页。
    .displayItems((params, output) -> {
        output.accept(MyItemsClass.MY_ITEM.get());
        // 接收 ItemLike。这里假设 MY_BLOCK 有对应物品。
        output.accept(MyBlocksClass.MY_BLOCK.get());
    })
    .build()
);
```

## `ItemLike`

`ItemLike` 是原版中由 `Item` 和[方块][block]实现的接口，定义 `#asItem` 方法，返回对象对应的物品表示：`Item` 返回自身；`Block` 如果有对应 `BlockItem` 则返回它，否则返回 `Blocks.AIR`。在物品“来源”并不重要时（例如许多[数据生成器][datagen]），会使用 `ItemLike`。

也可以在自定义对象上实现 `ItemLike`，只需重写 `#asItem`。

[armor]: armor.md
[block]: ../blocks/index.md
[blockstates]: ../blocks/states.md
[breaking]: ../blocks/index.md#breaking-a-block
[citems]: ../../26.1/resources/client/models/items.md
[creativetabs]: #creative-tabs
[datacomponents]: datacomponents.md
[datagen]: ../../26.1/resources/index.md#data-generation
[enchantment]: ../../26.1/resources/server/enchantments/index.md#enchantment-costs-and-levels
[entity]: ../entities/index.md
[food]: consumables.md#food
[hunger]: https://minecraft.wiki/w/Hunger#Mechanics
[interactions]: interactions.md
[loottables]: ../../26.1/resources/server/loottables/index.md
[modbus]: ../concepts/events.md#event-buses
[recipes]: ../../26.1/resources/server/recipes/index.md
[registering]: ../concepts/registries.md#methods-for-registering
[sides]: ../concepts/sides.md
[tools]: tools.md
[datagen]: ../../26.1/resources/index.md#data-generation
[i18n]: ../../26.1/resources/client/i18n.md
[texture]: ../../26.1/resources/client/textures.md
[tags]: ../../26.1/resources/server/tags.md
