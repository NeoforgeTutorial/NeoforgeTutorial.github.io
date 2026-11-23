# 可扩展枚举 {#extensible-enums}

可扩展枚举允许向特定的原版枚举添加新条目。实现方式是在运行时修改枚举的已编译字节码，并向其中加入新的元素。

## `IExtensibleEnum` {#iextensibleenum}

所有允许添加新条目的枚举都实现了 `IExtensibleEnum` 接口。该接口是一个标记接口，供 `RuntimeEnumExtender` 启动插件服务判断哪些枚举需要转换。

:::warning
**不要**让自己的枚举实现此接口。应根据具体用途改用映射或注册表。  
未经过补丁实现此接口的枚举，不能通过 Mixin 或核心模组再为它添加该接口，因为各类转换器的执行顺序不允许这样做。
:::

### 创建枚举条目 {#creating-an-enum-entry}

要创建新的枚举条目，需要创建一个 JSON 文件，并在 `neoforge.mods.toml` 的 `[[mods]]` 块中通过 `enumExtensions` 条目引用它。指定的路径必须相对于 `resources` 目录：

```toml
# 在 neoforge.mods.toml 中：
[[mods]]
## 文件路径相对于资源的输出目录；编译后则相对于 JAR 内的根路径
## 'resources' 目录表示资源的根输出目录
enumExtensions="META-INF/enumextensions.json"
```

条目定义包含目标枚举的类名、新字段名（必须以模组 ID 为前缀）、构造该条目所用构造方法的描述符，以及传给该构造方法的参数。

```json5
{
    "entries": [
        {
            // 该条目要添加到的枚举类
            "enum": "net/minecraft/world/item/ItemDisplayContext",
            // 新条目的字段名，必须以模组 ID 为前缀
            "name": "EXAMPLEMOD_STANDING",
            // 要使用的构造方法
            "constructor": "(ILjava/lang/String;Ljava/lang/String;)V",
            // 直接提供的常量参数
            "parameters": [ -1, "examplemod:standing", null ]
        },
        {
            "enum": "net/minecraft/world/item/Rarity",
            "name": "EXAMPLEMOD_CUSTOM",
            "constructor": "(ILjava/lang/String;Ljava/util/function/UnaryOperator;)V",
            // 要使用的参数，以给定类中的 EnumProxy<Rarity> 字段引用形式提供
            "parameters": {
                "class": "example/examplemod/MyEnumParams",
                "field": "CUSTOM_RARITY_ENUM_PROXY"
            }
        },
        {
            "enum": "net/minecraft/world/damagesource/DamageEffects",
            "name": "EXAMPLEMOD_TEST",
            "constructor": "(Ljava/lang/String;Ljava/util/function/Supplier;)V",
            // 要使用的参数，以给定类中的方法引用形式提供
            "parameters": {
                "class": "example/examplemod/MyEnumParams",
                "method": "getTestDamageEffectsParameter"
            }
        }
    ]
}
```

```java
public class MyEnumParams {
    public static final EnumProxy<Rarity> CUSTOM_RARITY_ENUM_PROXY = new EnumProxy<>(
            Rarity.class, -1, "examplemod:custom", (UnaryOperator<Style>) style -> style.withItalic(true)
    );
    
    public static Object getTestDamageEffectsParameter(int idx, Class<?> type) {
        return type.cast(switch (idx) {
            case 0 -> "examplemod:test";
            case 1 -> (Supplier<SoundEvent>) () -> SoundEvents.DONKEY_ANGRY;
            default -> throw new IllegalArgumentException("Unexpected parameter index: " + idx);
        });
    }
}
```

#### 构造方法 {#constructor}

构造方法必须使用[方法描述符][jvmdescriptors]指定，并且只包含源代码中可见的参数，省略隐藏的常量名称和序数参数。  
如果构造方法标记了 `@ReservedConstructor`，则不能用于模组枚举常量。

#### 参数 {#parameters}

参数有三种指定方式，可用的方式取决于参数类型：

- 在 JSON 中以常量数组内联提供。只允许基本类型值、字符串，以及向任意引用类型传入 `null`。
- 引用模组类中 `EnumProxy<TheEnum>` 类型的字段（参见上方的 `EnumProxy` 示例）。
    - 第一个参数指定目标枚举，后续参数会传给枚举构造方法。
- 引用返回 `Object` 的方法。返回值就是使用的参数值。方法必须恰好接收两个参数：`int`（参数索引）和 `Class<?>`（预期参数类型）。
    - 应使用传入的 `Class<?>` 对象调用 `Class#cast()` 转换返回值，使 `ClassCastException` 出现在模组代码中。

:::warning
作为参数值来源的字段和/或方法应放在单独的类中，避免过早加载其他模组类。
:::

某些参数还遵循额外规则：

- 如果参数是与枚举上 `@IndexedEnum` 注解关联的 int ID 参数，则该参数会被忽略，并替换为条目的序数。如果该参数内联写在 JSON 中，必须写成 `-1`，否则会抛出异常。
- 如果参数是与枚举上 `@NamedEnum` 注解关联的 String 名称参数，则必须按 `Identifier` 使用的 `namespace:path` 格式添加模组 ID 前缀，否则会抛出异常。

#### 获取生成的常量 {#retrieving-the-generated-constant}

生成的枚举常量可以通过 `TheEnum.valueOf(String)` 获取。如果使用字段引用提供参数，也可以通过 `EnumProxy#getValue()` 从 `EnumProxy` 对象取得该常量。

## 为 NeoForge 贡献可扩展枚举 {#contributing-to-neoforge}

要向 NeoForge 添加新的可扩展枚举，至少需要完成两件事：

- 让枚举实现 `IExtensibleEnum`，表示它应通过 `RuntimeEnumExtender` 转换。
- 添加返回 `ExtensionInfo.nonExtended(TheEnum.class)` 的 `getExtensionInfo` 方法。

根据枚举的具体情况，还需要额外操作：

- 如果枚举有一个应当与条目序数一致的 int ID 参数，应为枚举添加 `@IndexedEnum` 注解；如果该参数不是第一个参数，还需把它的参数索引写为注解值。
- 如果枚举有一个用于序列化、因此应带命名空间的 String 名称参数，应为枚举添加 `@NamedEnum` 注解；如果该参数不是第一个参数，还需把它的参数索引写为注解值。
- 如果枚举会通过网络发送，应添加 `@NetworkedEnum` 注解，并在注解中指定允许发送值的方向（客户端到服务端、服务端到客户端或双向）。
- 如果枚举包含模组无法使用的构造方法（例如构造时需要依赖注册表对象，而该枚举可能在模组注册运行之前初始化），应添加 `@ReservedConstructor` 注解。

:::note
如果枚举确实添加了任何条目，`getExtensionInfo` 方法会在运行时被转换为返回动态生成的 `ExtensionInfo`。
:::

```java
// 这是示例，不是原版中的实际枚举

// 第一个参数必须与枚举常量的序数一致
@net.neoforged.fml.common.asm.enumextension.IndexedEnum
// 第二个参数是必须以模组 ID 为前缀的字符串
@net.neoforged.fml.common.asm.enumextension.NamedEnum(1)
// 此枚举用于网络通信，必须检查客户端与服务端之间是否存在不匹配
@net.neoforged.fml.common.asm.enumextension.NetworkedEnum(net.neoforged.fml.common.asm.enumextension.NetworkedEnum.NetworkCheck.BIDIRECTIONAL)
public enum ExampleEnum implements net.neoforged.fml.common.asm.enumextension.IExtensibleEnum {
    // 此处 VALUE_1 表示名称参数
    VALUE_1(0, "value_1", false),
    VALUE_2(1, "value_2", true),
    VALUE_3(2, "value_3");

    ExampleEnum(int arg1, String arg2, boolean arg3) {
        // ...
    }

    ExampleEnum(int arg1, String arg2) {
        this(arg1, arg2, false);
    }

    public static net.neoforged.fml.common.asm.enumextension.ExtensionInfo getExtensionInfo() {
        return net.neoforged.fml.common.asm.enumextension.ExtensionInfo.nonExtended(ExampleEnum.class);
    }
}
```

[jvmdescriptors]: https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html#jvms-4.3.2
