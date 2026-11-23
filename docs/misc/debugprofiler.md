# 调试分析器 {#debug-profiler}

Minecraft 提供调试分析器，可输出系统数据、当前游戏设置、JVM 数据、关卡数据以及客户端和服务端各自的 tick 信息，用于找出耗时代码。考虑到 `TickEvent` 和正在 tick 的 `BlockEntity` 等情况，此工具对想要查找卡顿来源的模组作者和服务器管理员非常有用。

## 使用调试分析器 {#using-the-debug-profiler}

调试分析器使用很简单。按下调试组合键 `F3 + L` 即可开始分析。10 秒后它会自动停止；再次按下该组合键也可以提前停止。

:::note
自然，只能分析实际执行到的代码路径。想要分析的 [`Entity`][entity] 和 [`BlockEntity`][blockentity] 必须存在于关卡中，才能出现在结果里。
:::

停止调试分析器后，它会在运行目录的 `debug/profiling` 子目录中创建新的 ZIP 文件。文件名按日期和时间格式化为 `yyyy-mm-dd_hh_mi_ss-WorldName-VersionNumber.zip`。

## 解读分析结果 {#reading-a-profiling-result}

在客户端和服务端各自的文件夹（`client` 和 `server`）中，可以找到包含结果数据的 `profiling.txt`。文件顶部会首先说明分析运行了多少毫秒，以及在此期间执行了多少个 tick。

其下是类似下面的信息：

```
[00] tick(201/1) - 41.46%/41.46%
[01] |   levels(201/1) - 96.62%/40.05%
[02] |   |   ServerLevel[New World] minecraft:overworld(201/1) - 98.80%/39.58%
[03] |   |   |   tick(201/1) - 99.98%/39.57%
[04] |   |   |   |   entities(201/1) - 56.83%/22.49%
[05] |   |   |   |   |   tick(44717/222) - 95.81%/21.54%
[06] |   |   |   |   |   |   minecraft:skeleton(4585/23) - 13.91%/3.00%
[07] |   |   |   |   |   |   |   #tickNonPassenger 4585/22
[07] |   |   |   |   |   |   |   travel(4573/23) - 33.12%/0.99%
[08] |   |   |   |   |   |   |   |   #getChunkCacheMiss 7/0
[08] |   |   |   |   |   |   |   |   #getChunk 47227/234
[08] |   |   |   |   |   |   |   |   move(4573/23) - 40.10%/0.40%
[09] |   |   |   |   |   |   |   |   |   #getEntities 4573/22
[09] |   |   |   |   |   |   |   |   |   #getChunkCacheMiss 1353/6
[09] |   |   |   |   |   |   |   |   |   #getChunk 28482/141
[08] |   |   |   |   |   |   |   |   unspecified(4573/23) - 36.24%/0.36%
[08] |   |   |   |   |   |   |   |   rest(4573/23) - 23.66%/0.23%
[09] |   |   |   |   |   |   |   |   |   #getChunkCacheMiss 59/0
[09] |   |   |   |   |   |   |   |   |   #getChunk 65867/327
[09] |   |   |   |   |   |   |   |   |   #getChunkNow 531/2
```

某些条目（例如 `[03] tick(201/1) - 99.98%/39.57%`）来自 `ProfilerFiller#push` 和 `pop`。其含义如下：

- `[03]`：所在节的深度。
- `tick`：节的名称。
    - 如果一段时间内没有关联子节，则显示为 `unspecified`。
- `201`：分析器运行期间调用此节的次数。
- `1`：每个 tick 调用此节的平均次数，向下取整。
- `99.98%`：此节相对于父节所占的时间百分比。
    - 第 0 层表示占一个 tick 总时间的百分比。
    - 第 1 层表示占父节时间的百分比。
- `39.57%`：占总 tick 时间的百分比。

还有一些条目（例如 `[07] #tickNonPassenger 4585/22`）来自 `ProfileFiller#incrementCounter`。其含义如下：

- `[07]`：所在节的深度。
- `#tickNonPassenger`：递增计数器的名称。
    - `#` 是自动添加的前缀。
- `4585`：分析器运行期间此计数器递增的次数。
- `22`：每个 tick 此计数器递增的平均次数，向下取整。

## 分析自己的代码 {#profiling-your-own-code}

调试分析器对 `Entity` 和 `BlockEntity` 提供基本支持。如果想分析其他内容，可能需要手动创建分析节：

```java
Profiler.get().push("yourSectionName");
// 要分析的代码
Profiler.get().pop();
```

之后只需在结果文件中搜索你的节名称。

[blockentity]: ../blockentities/index.md
[entity]: ../entities/index.md
