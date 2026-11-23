# 标识符 {#identifiers}

`Identifier` 是 Minecraft 中最重要的对象之一。它用作[注册表][registries]中的键、数据或资源文件的标识符、代码中模型的引用，以及许多其他位置。`Identifier` 由命名空间和路径两部分组成，中间以 `:` 分隔。

命名空间表示该位置属于哪个模组、资源包或数据包。例如，模组 ID 为 `examplemod` 的模组会使用 `examplemod` 命名空间。Minecraft 使用 `minecraft` 命名空间。只要创建对应的数据文件夹，就可以定义额外的命名空间；数据包通常这样做，以便把自身逻辑与和原版整合的位置分开。

路径引用命名空间内所需的具体对象。例如，`minecraft:cow` 引用 `minecraft` 命名空间中名为 `cow` 的对象，这个位置通常用于从实体注册表获取牛实体。另一个例子是 `examplemod:example_item`，它可能用于从物品注册表获取模组的 `example_item`。

`Identifier` 只能包含小写字母、数字、下划线、句点和连字符。路径还可以包含正斜杠。注意，由于 Java 模块限制，模组 ID 不能包含连字符，因此模组命名空间也不能包含连字符（路径中仍允许使用连字符）。

:::info
单独的 `Identifier` 并不说明对象类型。例如，名为 `minecraft:dirt` 的对象可能存在于多个位置。接收 `Identifier` 的系统负责将它和某类对象关联起来。
:::

可以通过 `Identifier.fromNamespaceAndPath("examplemod", "example_item")` 或 `Identifier.parse("examplemod:example_item")` 创建新的 `Identifier`。如果使用 `withDefaultNamespace`，传入的字符串会作为路径，并由 `minecraft` 作为命名空间。例如，`Identifier.withDefaultNamespace("example_item")` 会得到 `minecraft:example_item`。

`Identifier` 的命名空间和路径可以分别通过 `Identifier#getNamespace()` 和 `#getPath()` 获取，组合形式可以通过 `Identifier#toString` 获取。

`Identifier` 不可变。`Identifier` 上的所有工具方法，例如 `withPrefix` 或 `withSuffix`，都会返回新的 `Identifier`。

## 解析 `Identifier` {#resolving-identifiers}

有些位置（例如注册表）会直接使用 `Identifier`，另一些位置则会按需解析 `Identifier`。例如：

- `Identifier` 用于标识 GUI 背景。熔炉界面使用标识符 `minecraft:textures/gui/container/furnace.png`，它对应磁盘上的 `assets/minecraft/textures/gui/container/furnace.png`。注意，此标识符必须包含 `.png` 后缀。
- `Identifier` 用于标识方块模型。泥土方块模型使用标识符 `minecraft:block/dirt`，它对应磁盘上的 `assets/minecraft/models/block/dirt.json`。注意，这里不需要 `.json` 后缀，而且该标识符会自动映射到 `models` 子文件夹。
- `Identifier` 用于标识客户端物品。苹果的客户端物品使用标识符 `minecraft:apple`（由 `DataComponents#ITEM_MODEL` 定义），它对应磁盘上的 `assets/minecraft/items/apple.json`。注意，这里不需要 `.json` 后缀，而且该标识符会自动映射到 `items` 子文件夹。
- `Identifier` 用于标识配方。铁块合成配方使用标识符 `minecraft:iron_block`，它对应磁盘上的 `data/minecraft/recipe/iron_block.json`。注意，这里不需要 `.json` 后缀，而且该标识符会自动映射到 `recipe` 子文件夹。

`Identifier` 是否需要文件后缀，以及它具体解析为什么，取决于具体用途。

## `ResourceKey` {#resourcekeys}

`ResourceKey` 把注册表 ID 和注册名组合在一起。例如，注册表 ID 为 `minecraft:item`、注册名为 `minecraft:diamond_sword` 的注册表键。与 `Identifier` 不同，`ResourceKey` 实际指向唯一的元素，因此能明确标识它。它最常用于多个不同注册表相互接触的场景，典型用例是数据包，尤其是世界生成。

可以通过静态方法 `ResourceKey#create(ResourceKey<? extends Registry<T>>, Identifier)` 创建新的 `ResourceKey`。第二个参数是注册名，第一个参数称为注册表键。注册表键是一种特殊的 `ResourceKey`，其注册表是根注册表（即所有其他注册表的注册表）。可以用 `ResourceKey#createRegistryKey(Identifier)` 和所需注册表的 ID 创建注册表键。

`ResourceKey` 在创建时会被驻留（interned）。因此可以并且鼓励使用引用相等（`==`）进行比较，但创建 `ResourceKey` 的成本相对较高。

[registries]: ../concepts/registries.md
[sides]: ../concepts/sides.md
