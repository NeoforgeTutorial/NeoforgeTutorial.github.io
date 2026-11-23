---
sidebar_position: 1
---
# 命名二进制标签（NBT）

NBT 是 Minecraft 最早引入的一种数据格式，最初由 Notch 编写。Minecraft 代码库在大量场景中使用它保存数据。

## 格式规范

NBT 规范与 JSON 规范相似，但有几点不同：

- NBT 为 byte、short、long 和 float 提供独立类型，并分别使用 `b`、`s`、`l` 和 `f` 后缀，与 Java 代码中的写法类似。
    - double 也可以带 `d` 后缀，但并非必需，这一点同样与 Java 类似。Java 中 int 可用的可选 `i` 后缀在 NBT 中不允许。
    - 后缀不区分大小写，例如 `64b` 与 `64B` 相同，`0.5F` 与 `0.5f` 相同。
- NBT 没有 boolean，改用 byte 表示：`true` 写作 `1b`，`false` 写作 `0b`。
    - 当前实现把所有非零值都视为 `true`，所以 `2b` 也会按 `true` 处理。
- NBT 没有与 `null` 等价的值。
- 键名两侧的引号可以省略。因此 JSON 中的属性 `"duration": 20` 在 NBT 中可以写作 `duration: 20`，也可以写作 `"duration": 20`。
- JSON 中的子对象在 NBT 中称为**复合标签**（compound tag），或简称为复合标签。
- 与 JSON 不同，NBT 列表不能混合不同类型。列表类型由第一个元素决定，也可以在代码中指定。
    - 不过，列表中的列表可以各自使用不同的列表类型。例如，一个列表可以包含两个列表，第一个是字符串列表，第二个是 byte 列表。
- NBT 还有与列表不同的特殊**数组**类型，但同样使用方括号包含元素。共有三种数组：
    - byte 数组，以 `B;` 开头，例如 `[B;0b,30b]`。
    - int 数组，以 `I;` 开头，例如 `[I;0,-300]`。
    - long 数组，以 `L;` 开头，例如 `[L;0l,240l]`。
- 列表、数组和复合标签允许末尾逗号。

## NBT 文件

Minecraft 大量使用 `.nbt` 文件，例如[数据包][datapack]中的结构文件。保存区域内容的区域文件（`.mca`）以及游戏各处以 `.dat` 为扩展名的文件，实际上也属于 NBT 文件。

NBT 文件通常使用 GZip 压缩，因此它们是二进制文件，不能直接编辑。

## 代码中的 NBT

与 JSON 一样，所有 NBT 对象都从属于一个外层对象。先创建一个：

```java
CompoundTag tag = new CompoundTag();
```

现在可以向其中写入数据：

```java
tag.putInt("Color", 0xffffff);
tag.putString("Level", "minecraft:overworld");
tag.putDouble("IAmRunningOutOfIdeasForNamesHere", 1d);
```

这里还有多种辅助方法。例如，除了接收 `int[]` 的标准版本外，`putIntArray` 还提供接收 `List<Integer>` 的便捷重载。

当然，也可以从标签中读取值：

```java
Optional<Integer> color = tag.getInt("Color");
Optional<String> level = tag.getString("Level");
Optional<Double> d = tag.getDouble("IAmRunningOutOfIdeasForNamesHere");
```

由于无法确定标签是否存在，读取结果会包装在 `Optional` 中。对于基本类型，可以通过 `*Or*` 方法指定默认值。`ListTag` 可以使用 `getListOrEmpty` 设置默认值，`CompoundTag` 可以使用 `getCompoundOrEmpty`。基本类型数组没有对应的 `*Or*` 方法。

```java
int color = tag.getIntOr("Color", 0xffffff);
String level = tag.getStringOr("Level", "minecraft:overworld");
double d = tag.getDoubleOr("IAmRunningOutOfIdeasForNamesHere", 1d);
```

所有标签类型都实现 `Tag` 接口。除 `CompoundTag` 外，大多数标签类型主要供内部使用，例如 `ByteTag` 和 `StringTag`；如果确实遇到它们，也可以使用 `CompoundTag#get` 和 `#put` 直接操作。

一个明显的例外是 `ListTag`。列表与某种标签类型关联，并会在内部计算该类型：

```java
ListTag newList = new ListTag();
// 向列表添加标签
newList.add(StringTag.valueOf("Value1"));
newList.add(StringTag.valueOf("Value2"));

// 获取标签
ListTag getList = tag.getListOrEmpty("SomeListHere");
```

最后，可以直接通过 `CompoundTag#get` 和 `#put` 操作复合标签中的其他复合标签：

```java
tag.put("Tag", new CompoundTag());

// 如果希望自行处理 null 情况，也可以使用普通的 `get`
tag.getCompoundOrEmpty("Tag");
```

## NBT 的用途

NBT 在 Minecraft 中的使用非常广泛。[`BlockEntity`][blockentity] 和 [`Entity`][entity] 把 NBT 操作抽象为[值访问][valueio]，`ItemStack` 则把它抽象为[数据组件][datacomponents]。

## 另见

- [Minecraft Wiki 上的 NBT 格式][nbtwiki]

[blockentity]: ../blockentities/index.md
[datapack]: ../resources/index.md#data
[datacomponents]: ../items/datacomponents.md
[entity]: ../entities/index.md
[nbtwiki]: https://minecraft.wiki/w/NBT_format
[valueio]: valueio.md
