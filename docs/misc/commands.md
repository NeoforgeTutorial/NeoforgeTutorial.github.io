# 命令 {#commands}

命令是从聊天栏以斜杠（`/`）开头的消息、服务器控制台、命令方块或[函数][functions]触发的文本操作。命令会在游戏中产生某种效果，例如修改世界、查询状态或提供调试工具。模组可以定义自己的命令，在调用时执行动态操作。

命令定义具有层级结构。Minecraft 的命令构建在 Mojang 的 [Brigadier] 库之上，将每条命令建模为一棵节点树，根节点是一个命令分派器。**字面量**节点匹配固定关键字，例如 `/mymod reload` 中的 `mymod` 或 `reload`；**参数**节点匹配有类型且带名称的输入，例如数字或实体选择器。节点通过 `#then` 连接，并通过 `#executes` 变为可执行节点。一个节点可以包含执行逻辑、子节点，或两者兼有。这种嵌套关系形成了子命令树。

参数会出现在两个位置。构建命令树时会**声明**参数，提供名称和 `ArgumentType`；执行逻辑中会从 `CommandContext` 使用同一个名称**取得**解析后的值。名称就是前后两端的约定。下面依次介绍这两部分。

## 注册命令 {#registering-commands}

在 [`RegisterCommandsEvent`][event] 期间，通过 `CommandDispatcher#register` 注册命令树：

```java
@SubscribeEvent // 在游戏事件总线上
public static void registerCommands(RegisterCommandsEvent event) {
    event.getDispatcher().register(
        Commands.literal("mymod")
            .then(Commands.literal("reload")
                .executes(context -> {
                    // 在此执行命令逻辑
                    return Command.SINGLE_SUCCESS;
                })
                .then(Commands.literal("force")
                    .executes(context -> {
                        // 在此执行命令逻辑
                        return Command.SINGLE_SUCCESS;
                    })
                )
            )
    );
}
```

`Commands#literal` 创建字面量构建器，`#then` 附加子节点，`#executes` 接收 `Command` 回调。回调返回的 `int` 是报告给调用者的结果数量，通常表示受影响玩家的数量。上面的示例注册了 `/mymod reload` 和 `/mymod reload force`。

也可以把命令注册到 `RegisterClientCommandsEvent`，而不是 `RegisterCommandsEvent`，从而创建客户端命令。客户端命令只会在客户端[端][sides]显示和运行，服务端没有这些命令。

:::note
对于需要访问注册表的更复杂命令树，`RegisterCommandsEvent#getBuildContext` 会提供 `CommandBuildContext`，可以传给需要它的参数类型。
:::

### 权限 {#permissions}

通过 `#requires` 添加权限节点，传入一个谓词。如果调用者可以执行命令，针对给定 `CommandSourceStack` 的谓词就应返回 `true`。谓词在服务端求值，因此可以检查调用者的权限等级或其他状态。

```java
Commands.literal("op-me")
        .requires(Commands.hasPermission(Commands.LEVEL_OWNERS))
        .executes(context -> {
            // 在此执行命令逻辑
            return Command.SINGLE_SUCCESS;
        })
```

:::note
`Commands#hasPermissions` 是辅助方法，用于根据给定阈值检查调用者权限等级。权限等级在 `Commands` 中定义为 `LEVEL_GAMEMASTERS`、`LEVEL_ADMINS` 和 `LEVEL_OWNERS`。

你也可以提供自定义 `PermissionCheck`。
:::

## 参数 {#arguments}

通过 `Commands#argument` 添加参数节点，提供参数名称和 `ArgumentType`。解析后的值会在 `#executes` 中通过与所选类型配对的静态 getter 读取，并使用同一个名称作为键。

```java
Commands.literal("give")
    .then(Commands.argument("count", IntegerArgumentType.integer(1))
        .executes(context -> {
            // 取得上面声明为 "count" 的值
            int count = IntegerArgumentType.getInteger(context, "count");

            // 使用 count...

            return count;
        }))
```

每种 `ArgumentType` 都提供一个用于声明参数的构建器，通常还提供一个用于取得解析值的静态 getter。如果提供的名称与当前路径上声明的参数不匹配，getter 会抛出异常，因此声明名称和访问名称必须一致。

:::note
如果某个 `ArgumentType` 没有提供静态 getter，可以通过 `CommandContext#getArgument`，使用参数名称和预期类取得解析值。
:::

参数不是通过某个标志变为可选。相反，需要在命令树的不同深度多次附加 `#executes`：在父节点上附加一次，处理参数缺失的情况；在参数节点上再附加一次，处理参数存在的情况。

## 参数类型 {#argument-types}

下表列出常见参数类型。每一行把声明参数使用的构建器和取得解析值使用的静态 getter 配对。

### Brigadier {#brigadier}

Brigadier 在 `com.mojang.brigadier.arguments` 中提供基本类型。

| 参数类型 | 声明（构建器） | 访问（getter） | 说明 |
| --- | --- | --- | --- |
| `BoolArgumentType` | `#bool` | `#getBool` | 布尔值。 |
| `IntegerArgumentType` | `#integer`（可选最小值和最大值） | `#getInteger` | 32 位整数。 |
| `LongArgumentType` | `#longArg`（可选最小值和最大值） | `#getLong` | 64 位整数。 |
| `FloatArgumentType` | `#floatArg`（可选最小值和最大值） | `#getFloat` | 单精度小数。 |
| `DoubleArgumentType` | `#doubleArg`（可选最小值和最大值） | `#getDouble` | 双精度小数。 |
| `StringArgumentType` | `#word`、`#string` 或 `#greedyString` | `#getString` | 一段文本，见下方说明。 |

:::note
`StringArgumentType` 的三个构建器消耗的文本范围不同。`#word` 读取一个不带引号的单词，在第一个空格处结束。`#string` 也读取一个单词，但如果输入被双引号包裹（`"hello world"`），则会读取整个引号内文本。`#greedyString` 读取参数之后的全部内容，包括空格，因此其后不能再有节点。
:::

### Minecraft 内置 {#built-in-minecraft}

Minecraft 在 `net.minecraft.commands.arguments` 中提供游戏专用参数类型。下表并非完整列表。

| 参数类型 | 声明（构建器） | 访问（getter） | 说明 |
| --- | --- | --- | --- |
| `EntityArgument` | `#entity`、`#entities`、`#player`、`#players` | `#getEntity`、`#getEntities`、`#getOptionalEntities`、`#getPlayer`、`#getPlayers`、`#getOptionalPlayers` | 按名称、UUID 或选择器（例如 `@p`、`@e`）选择一个或多个实体或玩家。 |
| `BlockPosArgument` | `#blockPos` | `#getLoadedBlockPos`、`#getBlockPos` | 方块位置。 |
| `Vec3Argument` | `#vec3` | `#getVec3` | 世界中的位置。 |
| `ItemArgument` | `#item` | `#getItem` | 物品堆叠，包括数据组件。 |
| `BlockStateArgument` | `#block` | `#getBlock` | 方块状态，包括方块实体数据。 |
| `ResourceArgument` | `#resource` | `#getResource` | 指向给定注册表条目的 [`Identifier`][identifier]。 |
| `ResourceKeyArgument` | `#key` | `#getRegistryKey` | 给定注册表的 [`ResourceKey`][resourcekey]。 |

### NeoForge {#neoforge}

NeoForge 在 `net.neoforged.neoforge.server.command` 中提供额外参数类型。

| 参数类型 | 声明（构建器） | 访问（getter） | 说明 |
| --- | --- | --- | --- |
| `EnumArgument` | `#enumArgument` | 使用键名和枚举类调用 `CommandContext#getArgument` | 枚举值。 |
| `ModIdArgument` | `#modIdArgument` | 使用键名和 `String.class` 调用 `CommandContext#getArgument` | 模组 ID。 |

## 自定义参数类型 {#custom-argument-types}

如果现有类型都无法解析某个值，可以通过实现 `ArgumentType<T>` 创建自定义参数类型。它从 `StringReader` 读取原始命令文本，并返回类型 `T` 的值。

```java
// 此示例中的 Spell 是自定义类型。
public class SpellArgument implements ArgumentType<Spell> {
    private static final DynamicCommandExceptionType ERROR_UNKNOWN_SPELL = new DynamicCommandExceptionType(
            name -> Component.translatableEscape("commands.examplemod.spell.unknown", name)
    );

    // 遵循原版参数类型的命名方式，声明参数时使用
    public static SpellArgument spell() {
        return new SpellArgument();
    }

    // 按参数需要消耗输入
    @Override
    public Spell parse(StringReader reader) throws CommandSyntaxException {
        String name = reader.readUnquotedString();
        // 验证提供的法术存在；若不存在，则抛出 ERROR_UNKNOWN_SPELL#createWithContext
    }

    // 可选，默认不提供建议：输入参数时给出的补全选项，见下方说明
    @Override
    public <S> CompletableFuture<Suggestions> listSuggestions(CommandContext<S> context, SuggestionsBuilder builder) {
        // 建议可用法术的名称，或不提供建议
        return Suggestions.empty();
    }

    // 可选，默认为空列表：Brigadier 用来检测同级节点之间歧义的示例输入
    @Override
    public Collection<String> getExamples() {
        return List.of("fireball", "heal");
    }
}
```

:::note
玩家输入时，客户端会解析同步来的命令树，并在这一过程中调用 `listSuggestions`，因此它只能建议客户端已经持有的数据，例如已同步注册表中的条目。仅服务端知道的数据必须先通过自定义[载荷][payload]发送给客户端，然后才能在这里提供建议；也可以由服务端通过参数节点上的 `#suggests` 自行提供建议。
:::

新类型没有静态 getter，通常会在构建器旁再添加一个，让它像内置类型一样访问值：

```java
public static Spell getSpell(CommandContext<CommandSourceStack> context, String name) {
    return context.getArgument(name, Spell.class);
}
```

:::tip
如果现有参数类型已经能解析目标值，只是建议内容需要不同，可以在参数节点上使用 `#suggests` 替换建议，无需自定义类型。通过这种方式添加的建议会在玩家输入时向服务端请求。
:::

### 同步 {#synchronization}

服务端会把命令树发送给每个客户端，使客户端能在输入时本地解析和补全命令。每个参数节点由 `ArgumentTypeInfo` 描述，该信息会按 `ArgumentType` 的类从 `COMMAND_ARGUMENT_TYPE` 注册表查找。上面参数类型表中列出的类型都已提供对应实现。没有对应信息实现的自定义类型无法发送给客户端。

`ArgumentTypeInfos#registerByClass` 会把 `ArgumentType` 类与其信息关联，并返回该信息，因此可以像下面这样在同一个语句中[注册][registration]：

```java
public static final DeferredRegister<ArgumentTypeInfo<?, ?>> COMMAND_ARGUMENT_TYPES =
        DeferredRegister.create(Registries.COMMAND_ARGUMENT_TYPE, ExampleMod.MOD_ID);

public static final DeferredHolder<ArgumentTypeInfo<?, ?>, SingletonArgumentInfo<SpellArgument>> SPELL = COMMAND_ARGUMENT_TYPES.register(
        // 参数类型的注册名。
        "spell",
        () -> ArgumentTypeInfos.registerByClass(
                // 参数类型的类。
                SpellArgument.class,
                // 描述它的信息。无参数构造的参数类型使用
                // 'contextFree'，需要 CommandBuildContext 的类型使用
                // 'contextAware'。
                SingletonArgumentInfo.contextFree(SpellArgument::spell)
        )
);
```

带有自身参数的参数类型（例如 `IntegerArgumentType` 的最小值和最大值）也需要把参数传给客户端，因此不能使用 `SingletonArgumentInfo`。此时应直接实现 `ArgumentTypeInfo`，并实现持有参数的 `ArgumentTypeInfo.Template`：`#serializeToNetwork` 和 `#deserializeFromNetwork` 在网络上传输模板，`#serializeToJson` 把模板写入命令树的 JSON 表示，`#unpack` 从参数类型创建模板，`Template#instantiate` 从模板创建参数类型。`EnumArgument.Info` 就是这种实现的一个小型示例。

[Brigadier]: https://github.com/Mojang/brigadier
[event]: ../concepts/events.md
[functions]: https://minecraft.wiki/w/Function_(Java_Edition)
[identifier]: ../misc/identifier.md
[payload]: ../networking/payload.md
[registration]: ../concepts/registries.md#methods-for-registering
[resourcekey]: ../misc/identifier.md#resourcekeys
[sides]: ../concepts/sides.md
