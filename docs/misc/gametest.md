import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 游戏测试 {#game-tests}

游戏测试是一种在游戏内运行单元测试的方式。该系统按可扩展、可并行的方式设计，能够高效运行大量不同的测试。检查对象交互和行为只是此框架众多用途中的一小部分。该系统既可以完全在代码中实现，也可以通过[数据包][datapacks]实现，下面会分别介绍。

## 创建游戏测试 {#creating-a-game-test}

标准游戏测试包含四个基本步骤：

1. 加载一个结构（或模板），其中包含用于测试交互或行为的场景。
2. 准备测试运行所需的环境。
3. 注册一个函数来运行测试逻辑。如果达到成功状态，则测试成功；否则测试失败，结果会存放到场景旁的讲台中。
4. 创建一个测试实例，把另外三个对象连接起来。

## 测试数据 {#the-test-data}

所有测试实例都持有一个 `TestData`，用于定义游戏测试的运行方式，包括初始配置、环境和结构模板。由于 `TestData` 序列化为 `MapCodec`，其数据与其他实例专用参数一起保存在文件根级。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 以游戏测试 examplemod:example_test 为例
// 位于 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    // 运行测试的环境
    // 指向 'data/examplemod/test_environment/example_environment.json'
    "environment": "examplemod:example_environment",

    // 游戏测试使用的结构
    // 指向 'data/examplemod/structure/example_structure.nbt'
    "structure": "examplemod:example_structure",

    // 游戏测试运行多少 tick 后自动失败
    "max_ticks": 400,

    // 用于设置游戏测试所需内容的 tick 数
    // 不计入测试可用的最大 tick 数
    // 未指定时默认为 0
    "setup_ticks": 50,

    // 测试是否必须成功，才能把整批测试标记为成功
    // 未指定时默认为 true
    "required": true,

    // 指定测试时如何旋转结构以及后续所有辅助方法使用的位置
    // 未指定时不旋转
    // 可为 'none'、'clockwise_90'、'180'、'counterclockwise_90'
    "rotation": "clockwise_90",

    // 为 true 时，测试只能通过 `/test` 命令运行
    // 未指定时默认为 false
    "manual_only": true,

    // 指定测试最多可以重新运行的次数
    // 未指定时默认为 1
    "max_attempts": 3,

    // 指定测试必须成功多少次才会被标记为成功
    // 必须小于或等于允许的最大尝试次数
    // 未指定时默认为 1
    "required_successes": 1,

    // 返回结构边界是否应保持顶部为空
    // 目前仅用于基于方块的测试实例
    // 未指定时默认为 false
    "sky_access": false

    // ...
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // 用它取得测试环境
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // 注册游戏测试
            // 与测试数据无关的字段已隐藏
            bootstrap.register(..., new FunctionGameTestInstance(...,
                new TestData<>(
                    // 运行测试的环境
                    // 指向 'data/examplemod/test_environment/example_environment.json'
                    environments.getOrThrow(EXAMPLE_ENVIRONMENT),

                    // 游戏测试使用的结构
                    // 指向 'data/examplemod/structure/example_structure.nbt'
                    Identifier.fromNamespaceAndPath("examplemod", "example_structure"),

                    // 游戏测试运行多少 tick 后自动失败
                    400,

                    // 用于设置游戏测试所需内容的 tick 数
                    // 不计入测试可用的最大 tick 数
                    // 未指定时默认为 0
                    50,

                    // 测试是否必须成功，才能把整批测试标记为成功
                    // 未指定时默认为 true
                    true,

                    // 指定测试时如何旋转结构以及后续所有辅助方法使用的位置
                    // 未指定时不旋转
                    // 可为 'none'、'clockwise_90'、'180'、'counterclockwise_90'
                    Rotation.CLOCKWISE_90,

                    // 为 true 时，测试只能通过 `/test` 命令运行
                    // 未指定时默认为 false
                    true,

                    // 指定测试最多可以重新运行的次数
                    // 未指定时默认为 1
                    3,

                    // 指定测试必须成功多少次才会被标记为成功
                    // 必须小于或等于允许的最大尝试次数
                    // 未指定时默认为 1
                    1,

                    // 返回结构边界是否应保持顶部为空
                    // 目前仅用于基于方块的测试实例
                    // 未指定时默认为 false
                    false
                )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

## 结构模板 {#structure-templates}

游戏测试在由结构（或称模板）加载的场景中运行。所有模板都定义场景尺寸以及初始数据（方块和实体）。模板必须保存为 `data/<namespace>/structure` 中的 `.nbt` 文件。`TestData#structure` 使用相对 `Identifier` 引用 NBT 文件（例如 `examplemod:example_structure` 指向 `data/examplemod/structure/example_structure.nbt`）。

## 测试环境 {#test-environments}

所有游戏测试都在某个 `TestEnvironmentDefinition` 中运行，该定义决定如何设置当前 `ServerLevel`。测试结束后，环境会被清理，让下一个或多个测试实例继续运行。所有环境都会分批执行，也就是说，多个测试实例使用相同环境时会同时运行。所有测试环境都位于 `data/<namespace>/test_environment/<path>.json`。

原版提供 `minecraft:default`，它不会修改 `ServerLevel`。此外还支持其他定义类型，可用来构造环境。

### 游戏规则 {#game-rules}

此环境类型设置测试使用的游戏规则。清理环境时，游戏规则会恢复为默认值。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// 位于 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:game_rules",

    // 游戏规则与其设定值的映射
    "rules": {
        "minecraft:fire_damage": false,
        "minecraft:players_sleeping_percentage": 50
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // 注册环境
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.SetGameRules(
                    new GameRuleMap.Builder()
                        // 游戏规则与其设定值的映射
                        .set(GameRules.FIRE_DAMAGE, false)
                        .set(GameRules.PLAYERS_SLEEPING_PERCENTAGE, 50)
                        .build()
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 时钟时间 {#clock-time}

此环境类型把指定的 `WorldClock` 时间设置为非负整数，作用类似 `/time of <clock> set <number>` 命令。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// 位于 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:clock_time",

    // 要设置时间的时钟
    // 指向 `data/<namespace>/world_clock/<path>.json` 中注册的时钟
    "clock": "minecraft:overworld",

    // 设置时钟的时间
    "time": 13000
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {
            // 获取时钟
            HolderGetter<WorldClock> clocks = bootstrap.lookup(Registries.WORLD_CLOCK);

            // 注册环境
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.ClockTime(
                    // 要设置时间的时钟
                    clocks.getOrThrow(WorldClocks.OVERWORLD),
                    // 设置时钟的时间
                    13000
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 时间线属性 {#timeline-attributes}

此环境类型设置要应用到关卡环境属性的时间线。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// 位于 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:timeline_attributes",

    // 要应用到关卡的时间线
    "timelines": [
        "minecraft:day",
        "minecraft:moon"
    ]
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {
            // 获取时间线
            HolderGetter<Timeline> timelines = bootstrap.lookup(Registries.TIMELINE);

            // 注册环境
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.Timelines(
                    // 要应用到关卡的时间线
                    List.of(
                        timelines.getOrThrow(Timelines.OVERWORLD_DAY),
                        timelines.getOrThrow(Timelines.MOON)
                    )
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 天气 {#weather}

此环境类型设置天气，作用类似 `/weather` 命令。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// 位于 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:weather",

    // 可为以下三个值之一：
    // - clear   （无天气）
    // - rain    （下雨）
    // - thunder （下雨并打雷）
    "weather": "thunder"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // 注册环境
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.Weather(
                    // 可为以下三个值之一：
                    // - clear   （无天气）
                    // - rain    （下雨）
                    // - thunder （下雨并打雷）
                    TestEnvironmentDefinition.Weather.Type.THUNDER
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### Minecraft 函数 {#minecraft-functions}

此环境类型分别提供两个指向 `mcfunction` 的标识符，用于设置和清理关卡。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// 位于 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:function",

    // 使用的设置 mcfunction
    // 未指定时不运行任何内容
    // 指向 'data/examplemod/function/example/setup.mcfunction'
    "setup": "examplemod:example/setup",

    // 使用的清理 mcfunction
    // 未指定时不运行任何内容
    // 指向 'data/examplemod/function/example/teardown.mcfunction'
    "teardown": "examplemod:example/teardown"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // 注册环境
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.Functions(
                    // 使用的设置 mcfunction
                    // 未指定时不运行任何内容
                    // 指向 'data/examplemod/function/example/setup.mcfunction'
                    Optional.of(Identifier.fromNamespaceAndPath("examplemod", "example/setup")),

                    // 使用的清理 mcfunction
                    // 未指定时不运行任何内容
                    // 指向 'data/examplemod/function/example/teardown.mcfunction'
                    Optional.of(Identifier.fromNamespaceAndPath("examplemod", "example/teardown"))
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 组合环境 {#composites}

可以使用组合环境类型合并多个环境。定义列表既可以引用现有定义，也可以内联定义。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// 位于 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:all_of",

    // 要使用的测试环境列表
    // 可以指定注册名或环境本身
    "definitions": [
        // 指向 'data/minecraft/test_environment/default.json'
        "minecraft:default",
        {
            // 原始环境定义
            "type": "..."
        }
        // ...
    ]
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {
            // 获取现有环境
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // 注册环境
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.AllOf(
                    List.of(
                        // 指向 'data/minecraft/test_environment/default.json'
                        environments.getOrThrow(GameTestEnvironments.DEFAULT_KEY),
                        Holder.direct(
                            // 在此创建新的 TestEnvironmentDefinition
                            ...
                        )
                        // ...
                    )
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 自定义定义类型 {#custom-definition-types}

自定义 `TestEnvironmentDefinition<SavedDataType>` 类型提供三个方法：`setup` 修改 `ServerLevel`，并返回修改前的 `SavedDataType` 泛型状态；`teardown` 使用 `SavedDataType` 恢复已修改的内容；`codec` 提供用于编码和解码该类型的 `MapCodec`：

```java
public record ExampleEnvironmentType(int value1, boolean value2) implements TestEnvironmentDefinition<Pair<Integer, Boolean>> {

    // 构造要注册的映射编解码器
    public static final MapCodec<ExampleEnvironmentType> CODEC = RecordCodecBuilder.mapCodec(instance -> instance.group(
            Codec.INT.fieldOf("value1").forGetter(ExampleEnvironmentType::value1),
            Codec.BOOL.fieldOf("value2").forGetter(ExampleEnvironmentType::value2)
        ).apply(instance, ExampleEnvironmentType::new)
    );

    @Override
    public Pair<Integer, Boolean> setup(ServerLevel level) {
        // 在此完成所需设置
        // 返回关卡中已修改数据的原始值
    }

    @Override
    public void teardown(ServerLevel level, Pair<Integer, Boolean> originalState) {
        // 撤销 setup 方法中所做的修改
        // 可以使用原始状态重置数据
    }

    @Override
    public MapCodec<ExampleEnvironmentType> codec() {
        return CODEC;
    }
}
```

随后可以[注册][registered] `MapCodec`：


```java
public static final DeferredRegister<MapCodec<? extends TestEnvironmentDefinition>> TEST_ENVIRONMENT_DEFINITION_TYPES = DeferredRegister.create(
        BuiltInRegistries.TEST_ENVIRONMENT_DEFINITION_TYPE,
        "examplemod"
);

public static final Supplier<MapCodec<ExampleEnvironmentType>> EXAMPLE_ENVIRONMENT_CODEC = TEST_ENVIRONMENT_DEFINITION_TYPES.register(
    "example_environment_type",
    () -> ExampleEnvironmentType.CODEC
);
```

最后，便可以在环境定义中使用该类型：

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// 位于 'data/examplemod/test_environment/example_environment.json'
{
    "type": "examplemod:example_environment_type",

    "value1": 0,
    "value2": true
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // 注册环境
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new ExampleEnvironmentType(
                    0, true
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

## 测试函数 {#the-test-function}

游戏测试的基本思路是运行一个接收 `GameTestHelper` 且没有返回值的方法，并通过调用 `GameTestHelper` 中的方法判断测试成功还是失败。每个测试函数都会[注册][registered]，因此可以在测试实例中引用：

```java
public class ExampleFunctions {

    // 下面是示例函数
    public static void exampleTest(GameTestHelper helper) {
        // 执行操作
    }
}

// 注册函数供使用
public static final DeferredRegister<Consumer<GameTestHelper>> TEST_FUNCTION = DeferredRegister.create(
        BuiltInRegistries.TEST_FUNCTION,
        "examplemod"
);

public static final DeferredHolder<Consumer<GameTestHelper>, Consumer<GameTestHelper>> EXAMPLE_FUNCTION = TEST_FUNCTION.register(
    "example_function",
    () -> ExampleFunctions::exampleTest
);
```

### 相对定位 {#relative-positioning}

所有测试函数都会使用结构方块的当前位置，把结构模板场景中的相对坐标转换为绝对坐标。可以分别使用 `GameTestHelper#absolutePos` 和 `GameTestHelper#relativePos`，方便地在相对位置与绝对位置之间转换。

在游戏中，可以通过以下方式取得结构模板内某点的相对位置：加载[测试命令][test]，把玩家放到目标位置，最后运行 `/test pos` 命令。该命令会取得玩家相对于 200 格内最近结构的坐标，并将其作为可复制的文本组件输出到聊天栏，最终可用作局部变量。

:::tip
`/test pos` 生成的局部变量可以在命令末尾指定引用名称：

```bash
/test pos <var> # 输出 'final BlockPos <var> = new BlockPos(...);'
```
:::

### 成功完成 {#successful-completion}

测试函数只负责一件事：在有效完成时把测试标记为成功。如果到达超时时间（由 `TestData#maxTicks` 定义）之前仍未达到成功状态，测试就会自动失败。

`GameTestHelper` 中有许多抽象方法可用于定义成功状态，其中四个尤其重要。

| 方法 | 说明 |
| :---: | :--- |
| `#succeed` | 把测试标记为成功。 |
| `#succeedIf` | 立即测试提供的 `Runnable`；如果没有抛出 `GameTestAssertException`，则成功。如果测试在当个 tick 内没有成功，则标记为失败。 |
| `#succeedWhen` | 在每个 tick 测试提供的 `Runnable`，直到超时；如果某个 tick 的检查没有抛出 `GameTestAssertException`，则成功。 |
| `#succeedOnTickWhen` | 在指定 tick 测试提供的 `Runnable`；如果没有抛出 `GameTestAssertException`，则成功。如果 `Runnable` 在其他任何 tick 成功，则标记为失败。 |

:::caution
游戏测试会在每个 tick 执行，直到被标记为成功。因此，安排在某一个 tick 成功的方法必须确保在此前每个 tick 都失败。
:::

### 安排操作 {#scheduling-actions}

并非所有操作都会在测试开始时发生。可以把操作安排在特定时间或间隔执行：

| 方法 | 说明 |
| :---: | :--- |
| `#runAtTickTime` | 在指定的 tick 运行操作。 |
| `#runAfterDelay` | 在当前 tick 之后 `x` 个 tick 运行操作。 |
| `#onEachTick` | 每个 tick 都运行操作。 |

### 断言 {#assertions}

在游戏测试的任何时刻，都可以进行断言，检查给定条件是否为真。`GameTestHelper` 中有许多断言方法；本质上，只要状态不符合要求，就会抛出 `GameTestAssertException`。

## 注册测试实例 {#registering-the-test-instance}

有了 `TestData`、`TestEnvironmentDefinition` 和测试函数后，便可以通过 `GameTestInstance` 把各部分连接起来。每个测试实例代表一个要运行的游戏测试。所有测试实例都位于 `data/<namespace>/test_instance/<path>.json`。

### 基于函数的测试 {#function-based-tests}

`FunctionGameTestInstance` 把 `TestData` 与某个已注册测试函数连接起来。调用测试实例时会运行对应的测试函数。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 以游戏测试 examplemod:example_test 为例
// 位于 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    "environment": "examplemod:example_environment",
    "structure": "examplemod:example_structure",
    "max_ticks": 400,
    "setup_ticks": 50,
    "required": true,
    "rotation": "clockwise_90",
    "manual_only": true,
    "max_attempts": 3,
    "required_successes": 1,
    "sky_access": false,

    // `FunctionGameTestInstance`
    "type": "minecraft:function",

    // 指向测试函数注册表中的 'Consumer<GameTestHelper>'
    "function": "examplemod:example_function"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 测试实例键
public static final ResourceKey<GameTestInstance> EXAMPLE_TEST_INSTANCE = ResourceKey.create(
    Registries.TEST_INSTANCE,
    Identifier.fromNamespaceAndPath("examplemod", "example_test")
);

// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // 用它取得测试环境
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // 注册游戏测试
            // 与测试数据无关的字段已隐藏
            bootstrap.register(EXAMPLE_TEST_INSTANCE,
                new FunctionGameTestInstance(
                    // 指向测试函数注册表中的 'Consumer<GameTestHelper>'
                    EXAMPLE_FUNCTION.getKey()
                    new TestData<>(
                        environments.getOrThrow(EXAMPLE_ENVIRONMENT),
                        Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                        400,
                        50,
                        true,
                        Rotation.CLOCKWISE_90,
                        true,
                        3,
                        1,
                        false
                    )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

### 基于方块的测试 {#block-based-tests}

`BlockBasedTestInstance` 是一种特殊测试实例，依赖 `Blocks#TEST_BLOCK` 发送和接收红石信号。要运行这种测试，结构模板中必须至少包含两个测试方块：恰好一个设为 `TestBlockMode#START`，一个设为 `TestBlockMode#ACCEPT`。测试开始时，起始测试方块会被触发，并发送持续一个 tick 的强度 15 信号脉冲。该信号最终应触发其他处于 `LOG`、`FAIL` 或 `ACCEPT` 状态的测试方块。`LOG` 测试方块被激活时也会发送强度 15 的信号脉冲。`ACCEPT` 和 `FAIL` 测试方块分别使测试实例成功或失败。在同一个 tick 中，`ACCEPT` 始终优先于 `FAIL`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 以游戏测试 examplemod:example_test 为例
// 位于 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    "environment": "examplemod:example_environment",
    "structure": "examplemod:example_structure",
    "max_ticks": 400,
    "setup_ticks": 50,
    "required": true,
    "rotation": "clockwise_90",
    "manual_only": true,
    "max_attempts": 3,
    "required_successes": 1,
    "sky_access": false,

    // `BlockBasedTestInstance`
    "type": "minecraft:block_based"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 测试实例键
public static final ResourceKey<GameTestInstance> EXAMPLE_TEST_INSTANCE = ResourceKey.create(
    Registries.TEST_INSTANCE,
    Identifier.fromNamespaceAndPath("examplemod", "example_test")
);

// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // 用它取得测试环境
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // 注册游戏测试
            // 与测试数据无关的字段已隐藏
            bootstrap.register(EXAMPLE_TEST_INSTANCE,
                new BlockBasedTestInstance(
                    new TestData<>(
                        environments.getOrThrow(EXAMPLE_ENVIRONMENT),
                        Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                        400,
                        50,
                        true,
                        Rotation.CLOCKWISE_90,
                        true,
                        3,
                        1,
                        false
                    )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

### 自定义测试实例 {#custom-test-instances}

如果因某种原因需要实现自己的测试逻辑，可以继承 `GameTestInstance`。必须实现两个方法：`run` 表示测试函数，`typeDescription` 提供测试实例的说明。如果测试实例要用于数据生成，还必须提供可[注册][registered]的 `MapCodec`。

```java
public class ExampleTestInstance extends GameTestInstance {

    public ExampleTestInstance(int value1, boolean value2, TestData<Holder<TestEnvironmentDefinition>> info) {
        super(info);
    }

    @Override
    public void run(GameTestHelper helper) {
        // 运行所需的任意游戏测试命令
        helper.assertBlockPresent(...);

        // 确保提供某种成功方式
        helper.succeedIf(() -> ...);
    }

    @Override
    public MapCodec<ExampleTestInstance> codec() {
        return EXAMPLE_INSTANCE_CODEC.get();
    }

    @Override
    protected MutableComponent typeDescription() {
        // 说明此测试的用途
        // 应使用可翻译组件
        return Component.literal("Example Test Instance");
    }
}

// 注册测试实例供使用
public static final DeferredRegister<MapCodec<? extends GameTestInstance>> TEST_INSTANCE = DeferredRegister.create(
        BuiltInRegistries.TEST_INSTANCE_TYPE,
        "examplemod"
);

public static final Supplier<MapCodec<? extends GameTestInstance>> EXAMPLE_INSTANCE_CODEC = TEST_INSTANCE.register(
    "example_test_instance",
    () -> RecordCodecBuilder.mapCodec(instance -> instance.group(
            Codec.INT.fieldOf("value1").forGetter(test -> test.value1),
            Codec.BOOL.fieldOf("value2").forGetter(test -> test.value2),
            TestData.CODEC.forGetter(ExampleTestInstance::info)
        ).apply(instance, ExampleTestInstance::new)
    )
);
```

随后可以在数据包中使用该测试实例：

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 以游戏测试 examplemod:example_test 为例
// 位于 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    "environment": "examplemod:example_environment",
    "structure": "examplemod:example_structure",
    "max_ticks": 400,
    "setup_ticks": 50,
    "required": true,
    "rotation": "clockwise_90",
    "manual_only": true,
    "max_attempts": 3,
    "required_successes": 1,
    "sky_access": false,

    // `ExampleTestInstance`
    "type": "examplemod:example_test_instance",

    "value1": 0,
    "value2": true
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 测试实例键
public static final ResourceKey<GameTestInstance> EXAMPLE_TEST_INSTANCE = ResourceKey.create(
    Registries.TEST_INSTANCE,
    Identifier.fromNamespaceAndPath("examplemod", "example_test")
);

// 假设已有某个测试环境
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // 用它取得测试环境
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // 注册游戏测试
            // 与测试数据无关的字段已隐藏
            bootstrap.register(EXAMPLE_TEST_INSTANCE,
                new ExampleTestInstance(
                    0,
                    true,
                    new TestData<>(
                        environments.getOrThrow(EXAMPLE_ENVIRONMENT),
                        Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                        400,
                        50,
                        true,
                        Rotation.CLOCKWISE_90,
                        true,
                        3,
                        1,
                        false
                    )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

### 跳过数据包 {#skipping-the-datapack}

如果不希望使用数据包构建游戏测试，可以改为在[模组事件总线][event]上监听 `RegisterGameTestsEvent`，并分别通过 `registerEnvironment` 和 `registerTest` 注册环境和测试实例。

```java
@SubscribeEvent // 在模组事件总线上
public static void registerTests(RegisterGameTestsEvent event) {
    Holder<TestEnvironmentDefinition<?>> environment = event.registerEnvironment(
        // 测试环境的名称
        EXAMPLE_ENVIRONMENT.identifier(),
        // 测试环境定义的可变参数
        new ExampleEnvironmentType(
            0, true
        )
    );

    event.registerTest(
        // 测试实例的名称
        EXAMPLE_TEST_INSTANCE.identifier(),
        new ExampleTestInstance(
            0,
            true,
            new TestData<>(
                environment,
                Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                400,
                50,
                true,
                Rotation.CLOCKWISE_90,
                true,
                3,
                1,
                false
            )
        )
    );
}
```

## 运行游戏测试 {#running-game-tests}

可以使用 `/test` 命令运行游戏测试。`test` 命令高度可配置；不过在运行测试时，只有少数几个子命令较为重要：

| 子命令 | 说明 |
| :---: | :--- |
| `run` | 运行指定测试：`run <test_name>`。 |
| `runall` | 运行所有可用测试。 |
| `runclosest` | 运行玩家 15 格内最近的测试。 |
| `runthese` | 运行玩家 200 格内的测试。 |
| `runfailed` | 运行上一轮失败的所有测试。 |

:::note
子命令紧跟在测试命令之后：`/test <subcommand>`。
:::

## 构建脚本配置 {#buildscript-configurations}

游戏测试在构建脚本（`build.gradle` 文件）中提供额外配置，用于在不同设置中运行和集成。

### 游戏测试服务器运行配置 {#game-test-server-run-configuration}

游戏测试服务器是一种特殊配置，会运行构建服务器。构建服务器返回的退出码是必需但失败的测试数量。所有失败测试都会记录日志，无论其是否必需。可以通过 `gradlew runGameTestServer` 运行此服务器。

### 在其他运行配置中启用游戏测试 {#enabling-game-tests-in-other-run-configurations}

默认情况下，只有 `client` 和 `gameTestServer` 运行配置启用了游戏测试。如果其他运行配置也要运行游戏测试，必须把 `neoforge.enableGameTest` 属性设为 `true`。

```gradle
// 在某个运行配置中
property 'neoforge.enableGameTest', 'true'
```

[datapacks]: ../resources/index.md#data
[registered]: ../concepts/registries.md#methods-for-registering
[test]: #running-game-tests
[event]: ../concepts/events.md#registering-an-event-handler
