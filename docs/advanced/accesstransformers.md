import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 访问转换器 {#access-transformers}

访问转换器（Access Transformer，简称 AT）可以扩大类、方法和字段的可见性，并修改它们的 `final` 标志。模组作者因此能够访问和修改自己无法控制的类中原本不可访问的成员。

规范文档可在 NeoForged GitHub 上的[规范文件][specs]中查看。

## 添加 AT {#adding-ats}

为模组项目添加访问转换器，只需在 `build.gradle` 中加入一行：

访问转换器必须在 `build.gradle` 中声明。AT 文件可以放在任意位置，只要编译时会被复制到 `resources` 输出目录即可。

<Tabs defaultValue="mdg">
<TabItem value="mdg" label="ModDevGradle">

默认情况下，无需在此进行任何操作！

</TabItem>
<TabItem value="ng" label="NeoGradle">

```gradle
// 在 build.gradle 中：
minecraft {
    accessTransformers {
        file 'src/main/resources/META-INF/accesstransformer.cfg'
    }
}
```

</TabItem>
</Tabs>

默认情况下，NeoForge 会查找 `META-INF/accesstransformer.cfg`。如果 `build.gradle` 将访问转换器指定在其他位置，则需要在 `neoforge.mods.toml` 中声明这些文件的位置：

```toml
# 在 neoforge.mods.toml 中：
[[accessTransformers]]
## 文件路径相对于资源的输出目录；编译后则相对于 JAR 内的根路径
## 'resources' 目录表示资源的根输出目录
file="META-INF/accesstransformer.cfg"
```

此外，可以指定多个 AT 文件，它们会按声明顺序应用。对于包含多个软件包的大型模组，这很有用。

<Tabs defaultValue="mdg">
<TabItem value="mdg" label="ModDevGradle">

```gradle
// 在 build.gradle 中：
neoForge {
    // ModDevGradle 默认已经尝试包含 'src/main/resources/META-INF/accesstransformer.cfg'
    accessTransformers.from 'src/additions/resources/accesstransformer_additions.cfg'
}
```

</TabItem>
<TabItem value="ng" label="NeoGradle">

```gradle
// 在 build.gradle 中：
minecraft {
    accessTransformers {
        file 'src/main/resources/META-INF/accesstransformer.cfg'
        file 'src/additions/resources/accesstransformer_additions.cfg'
    }
}
```

</TabItem>
</Tabs>

```toml
# 在 neoforge.mods.toml 中
[[accessTransformers]]
file="accesstransformer.cfg"

[[accessTransformers]]
file="accesstransformer_additions.cfg"
```

添加或修改任何访问转换器后，必须刷新 Gradle 项目，转换才会生效。

## 访问转换器规范 {#the-access-transformer-specification}

### 注释 {#comments}

`#` 之后直到行尾的全部文本都会被视为注释，不会参与解析。

### 访问修饰符 {#access-modifiers}

访问修饰符用于指定目标成员要被转换成的可见性。按可见性从高到低排列：

- `public`：包内和包外的所有类均可见。
- `protected`：仅包内的类和子类可见。
- `default`：仅包内的类可见。
- `private`：仅类内部可见。

上述修饰符后可以附加特殊修饰符 `+f` 或 `-f`，分别用于添加或移除 `final` 修饰符。`final` 会阻止继承类、重写方法或修改字段。

:::danger
指令只会修改其直接引用的方法，任何重写方法都不会被自动访问转换。应确保被转换的方法没有会限制可见性的未转换重写方法，否则 JVM 会抛出错误。

可以安全转换的方法包括 `final` 方法（或 `final` 类中的方法）以及 `static` 方法。`private` 方法通常也是安全的；但它可能在子类型中造成意外重写，因此仍需额外手动验证。
:::

### 目标与指令 {#targets-and-directives}

#### 类 {#classes}

定位类时使用：

```
<访问修饰符> <全限定类名>
```

内部类由外部类的全限定名和内部类名组合而成，并使用 `$` 分隔。

#### 字段 {#fields}

定位字段时使用：

```
<访问修饰符> <全限定类名> <字段名>
```

#### 方法 {#methods}

定位方法需要使用专门语法来表示方法参数和返回类型：

```
<访问修饰符> <全限定类名> <方法名>(<参数类型>)<返回类型>
```

##### 指定类型 {#specifying-types}

这些类型描述符也称为“descriptor”。更详细的技术说明请参阅 [Java 虚拟机规范 SE 21 第 4.3.2 节和第 4.3.3 节][jvmdescriptors]。

- `B`：`byte`，有符号字节。
- `C`：`char`，UTF-16 中的 Unicode 字符码点。
- `D`：`double`，双精度浮点数。
- `F`：`float`，单精度浮点数。
- `I`：`integer`，32 位整数。
- `J`：`long`，64 位整数。
- `S`：`short`，有符号短整数。
- `Z`：`boolean`，`true` 或 `false` 值。
- `[`：表示一维数组。
    - 例如，`[[S` 表示 `short[][]`。
- `L<类名>;`：表示引用类型。
    - 例如，`Ljava/lang/String;` 表示 `java.lang.String` 引用类型（注意这里使用斜杠而不是句点）。
- `(`：表示方法描述符，应在其中提供参数；没有参数时不填写。
    - 例如，`<方法名>(I)Z` 表示接收一个整数参数并返回布尔值的方法。
- `V`：表示方法没有返回值，只能用在方法描述符末尾。
    - 例如，`<方法名>()V` 表示不接收参数且没有返回值的方法。

### 示例 {#examples}

```
# 将 Crypt 中的 ByteArrayToKeyFunction 接口设为 public
public net.minecraft.util.Crypt$ByteArrayToKeyFunction

# 将 MinecraftServer 中 'random' 的访问权限设为 protected，并移除 final 修饰符
protected-f net.minecraft.server.MinecraftServer random

# 将 Util 中的 'makeExecutor' 方法设为 public
# 该方法接收一个 String，并返回 TracingExecutor
public net.minecraft.Util makeExecutor(Ljava/lang/String;)Lnet/minecraft/TracingExecutor;

# 将 UUIDUtil 中的 'leastMostToIntArray' 方法设为 public
# 该方法接收两个 long，并返回一个 int[]
public net.minecraft.core.UUIDUtil leastMostToIntArray(JJ)[I
```

[specs]: https://github.com/NeoForged/AccessTransformers/blob/main/FMLAT.md
[jvmdescriptors]: https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html#jvms-4.3.2
