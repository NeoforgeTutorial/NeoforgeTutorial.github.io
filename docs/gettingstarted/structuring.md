# 组织模组结构

结构清晰的模组更便于维护、接受他人贡献，也更容易理解底层代码库。下面列出 Java、Minecraft 和 NeoForge 的一些建议。

:::note
你不必遵循以下建议，可以按自己认为合适的方式组织模组。不过，仍然强烈推荐这样做。
:::

## 打包 {#packaging}

组织模组时，应选择唯一的顶层包结构。许多程序员会为不同的类、接口等使用相同名称。Java 允许不同包中的类同名。因此，如果两个类具有相同的包名和类名，只会加载其中一个，通常会导致游戏崩溃。

```
a.jar
    - com.example.ExampleClass
b.jar
    - com.example.ExampleClass // 通常不会加载这个类
```

加载模块时，这个问题更加重要。如果不同模块的两个同名包中都包含类文件，模组加载器会在启动时崩溃，因为模组模块会导出给游戏和其他模组。

```
模块 A
    - 包 X
        - 类 I
        - 类 J
模块 B
    - 包 X // 这个包会导致模组加载器崩溃，因为已经有一个导出包 X 的模块
        - 类 R
        - 类 S
        - 类 T
```

因此，顶层包应当是你能控制且唯一可识别的内容，例如域名、电子邮件地址或网站（的子域名）等。也可以是你的名字或用户名，只要能保证在预期范围内具有唯一性即可。此外，顶层包还应与你的 [group ID][group] 一致。

|   类型   |       值          | 顶层包                |
|:--------:|:-----------------:|:----------------------|
|   域名   |    example.com    | `com.example`         |
|  子域名  | example.github.io | `io.github.example`   |
|  电子邮件 | example@gmail.com | `com.gmail.example`   |

下一级包应当是模组 ID，例如当模组 ID 为 `examplemod` 时使用 `com.example.examplemod`。除非两个模组具有相同 ID（不应发生这种情况），否则这能保证你的包不会产生加载问题。

更多命名约定可参阅 [Oracle 的教程页面][naming]。

### 子包组织

除了顶层包之外，还强烈建议把模组中的类分到不同子包中。主要有两种做法：

- **按功能分组**：为用途相同的类创建子包。例如，方块类放到 `block`，物品类放到 `item`，实体类放到 `entity`，等等。Minecraft 本身也使用类似结构（存在一些例外）。
- **按逻辑分组**：为逻辑关联紧密的类创建子包。例如，制作一种新的工作台时，可以把它的方块、菜单、物品等内容都放到 `feature.crafting_table` 下。

#### 客户端、服务端和数据包

一般来说，只用于特定端或运行环境的代码应单独放到子包中，与其他类隔离。例如，与[数据生成][datagen]相关的代码应放到 `data` 包中，只能在专用服务器上运行的代码应放到 `server` 包中。

强烈建议把[仅客户端代码][sides]隔离到 `client` 子包中。专用服务器无法访问 Minecraft 中任何仅客户端包，如果模组尝试访问这些包就会崩溃。因此，单独设置包能形成一道基本检查，帮助你发现模组中跨越客户端和服务端的访问。

## 类命名方案

统一的类命名方案更容易看出类的用途，也更容易找到特定类。

类通常会带有表示其类型的后缀，例如：

- 名为 `PowerRing` 的 `Item` -> `PowerRingItem`。
- 名为 `NotDirt` 的 `Block` -> `NotDirtBlock`。
- 用于 `Oven` 的菜单 -> `OvenMenu`。

:::tip
Mojang 通常也为所有类采用类似结构，实体除外。实体类只使用实体名称，例如 `Pig`、`Zombie` 等。
:::

## 从多种方法中选择一种

完成同一项任务通常有多种方法，例如注册对象、监听事件等。一般建议始终使用同一种方法来处理给定任务。这样可以提高可读性，并避免出现奇怪的交互或重复，例如事件监听器被执行两次。

[group]: modfiles.md#the-group-id
[naming]: https://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html
[datagen]: ../resources/index.md#data-generation
[sides]: ../concepts/sides.md
