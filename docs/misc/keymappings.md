# 按键映射 {#key-mappings}

按键映射（key mapping，也称按键绑定）定义与某种输入（鼠标点击、按键等）关联的特定操作。只要客户端能够接收输入，就可以检查按键映射定义的操作。此外，每个按键映射都可以在[控制选项菜单][controls]中分配到任意输入。

## 注册 `KeyMapping` {#registering-a-keymapping}

可以只在物理客户端上监听[模组事件总线][eventbus]中的 `RegisterKeyMappingsEvent`，并调用 `#register` 来注册 `KeyMapping`。

```java
// 在某个仅物理客户端使用的类中

// 按键映射采用惰性初始化，因此在注册前并不存在
public static final Lazy<KeyMapping> EXAMPLE_MAPPING = Lazy.of(() -> /*...*/);

@SubscribeEvent // 只在物理客户端上监听模组事件总线
public static void registerBindings(RegisterKeyMappingsEvent event) {
    event.register(EXAMPLE_MAPPING.get());
}
```

## 创建 `KeyMapping` {#creating-a-keymapping}

可以使用构造方法创建 `KeyMapping`。构造方法接收定义映射名称的[翻译键][tk]、默认输入，以及定义映射在[控制选项菜单][controls]中所属分类的 `KeyMapping.Category`。

:::tip
可以使用 `Identifier` 创建新的 `KeyMapping.Category`，并只在[物理客户端][sides]上通过[模组事件总线][eventbus]的 `RegisterKeyMappingsEvent#registerCategory` 注册，从而把 `KeyMapping` 加入自定义分类。该分类对应的[翻译键][tk]为 `key.category.<namespace>.<path>`。

```java
public static final KeyMapping.Category EXAMPLE_CATEGORY = new KeyMapping.Category(Identifier.fromNamespaceAndPath("examplemod", "category"));

@SubscribeEvent // 只在物理客户端上监听模组事件总线
public static void registerBindings(RegisterKeyMappingsEvent event) {
    // 注册分类
    event.registerCategory(EXAMPLE_CATEGORY);

    // 注册使用该分类的按键绑定
    event.register(EXAMPLE_MAPPING.get());
}
```

:::

### 默认输入 {#default-inputs}

每个按键映射都有关联的默认输入，由 `InputConstants.Key` 提供。每个输入由一个 `InputConstants.Type` 和一个整数组成：前者定义提供输入的设备，后者定义该设备上输入对应的标识符。

原版提供三种输入类型：`KEYSYM` 通过提供的 `GLFW` 键标记表示键盘，`SCANCODE` 通过平台相关的扫描码表示键盘，`MOUSE` 表示鼠标。

:::note
对于键盘，强烈建议使用 `KEYSYM`，而不是 `SCANCODE`，因为 `GLFW` 键标记不依赖特定系统。更多信息请参阅 [GLFW 文档][keyinput]。
:::

整数值取决于输入类型。所有输入代码都定义在 `GLFW` 中：`KEYSYM` 标记以 `GLFW_KEY_*` 为前缀，`MOUSE` 代码以 `GLFW_MOUSE_*` 为前缀。

```java
new KeyMapping(
    "key.examplemod.example1", // 使用此翻译键进行本地化
    InputConstants.Type.KEYSYM, // 默认映射到键盘
    GLFW.GLFW_KEY_P, // 默认按键为 P
    KeyMapping.Category.MISC // 映射归入其他分类
)
```

:::note
如果按键映射不应具有默认输入，应把输入设为 `InputConstants#UNKNOWN`。原版构造方法要求通过 `InputConstants$Key#getValue` 提取输入代码，而 NeoForge 构造方法可以直接传入原始输入字段。
:::

### `IKeyConflictContext` {#ikeyconflictcontext}

并非所有映射都会在每个场景中使用。有些映射只在 GUI 中使用，另一些只在游戏内使用。为了避免不同场景中同一按键的映射发生冲突，可以指定 `IKeyConflictContext`。

每个冲突上下文包含两个方法：`#isActive` 定义映射能否在当前游戏状态下使用，`#conflicts` 定义该映射是否会与同一或不同冲突上下文中的按键冲突。

目前 NeoForge 通过 `KeyConflictContext` 定义三个基本上下文：`UNIVERSAL` 是默认值，表示按键可在任何上下文中使用；`GUI` 表示映射只能在 `Screen` 打开时使用；`IN_GAME` 表示映射只能在 `Screen` 未打开时使用。实现 `IKeyConflictContext` 可以创建新的冲突上下文。

```java
new KeyMapping(
    "key.examplemod.example2",
    KeyConflictContext.GUI, // 映射只能在屏幕打开时使用
    InputConstants.Type.MOUSE, // 默认映射到鼠标
    GLFW.GLFW_MOUSE_BUTTON_LEFT, // 默认鼠标输入为左键
    EXAMPLE_CATEGORY // 映射归入新的示例分类
)
```

### `KeyModifier` {#keymodifier}

模组作者可能不希望按住修饰键时与未按住修饰键时具有相同行为（例如 `G` 和 `CTRL + G`）。为此，NeoForge 在构造方法中增加了一个 `KeyModifier` 参数，可以给任意输入应用控制键（`KeyModifier#CONTROL`）、Shift 键（`KeyModifier#SHIFT`）或 Alt 键（`KeyModifier#ALT`）。`KeyModifier#NONE` 是默认值，不应用修饰键。

在[控制选项菜单][controls]中按住修饰键并按下相关输入，即可添加修饰键。

```java
new KeyMapping(
    "key.examplemod.example3",
    KeyConflictContext.UNIVERSAL,
    KeyModifier.SHIFT, // 默认映射要求按住 Shift
    InputConstants.Type.KEYSYM, // 默认映射到键盘
    GLFW.GLFW_KEY_G, // 默认按键为 G
    KeyMapping.Category.MISC
)
```

## 检查 `KeyMapping` {#checking-a-keymapping}

可以检查 `KeyMapping` 是否被点击。根据所在位置，可以在条件判断中使用映射并执行相关逻辑。

### 游戏内 {#within-the-game}

游戏内应监听[事件总线][eventbus]中的 `ClientTickEvent.Post`，并在 `while` 循环中检查 `KeyMapping#consumeClick`。只有在输入被触发且此前尚未处理对应次数时，`#consumeClick` 才会返回 `true`，因此不会让游戏无限停滞。

```java
@SubscribeEvent // 只在物理客户端上监听游戏事件总线
public static void onClientTick(ClientTickEvent.Post event) {
    while (EXAMPLE_MAPPING.get().consumeClick()) {
        // 在此执行点击后应运行的逻辑
    }
}
```

:::caution
不要使用 `InputEvent` 代替 `ClientTickEvent.Post`。它们只分别处理键盘和鼠标输入，无法处理其他输入类型。
:::

### GUI 内 {#inside-a-gui}

在 GUI 中，可以在某个 `GuiEventListener` 方法里通过 `IKeyMappingExtension#isActiveAndMatches` 检查映射。最常检查的方法包括 `#keyPressed` 和 `#mouseClicked`。

`#keyPressed` 接收一个 `KeyEvent`，其中包含 `GLFW` 键标记、平台相关扫描码和已按住修饰键的位字段。可以通过 `InputConstants#getKey` 创建输入，再与映射比较。映射方法本身已经会检查修饰键。

```java
// 在某个 Screen 子类中
@Override
public boolean keyPressed(KeyEvent event) {
    if (EXAMPLE_MAPPING.get().isActiveAndMatches(InputConstants.getKey(event))) {
        // 在此执行按键后应运行的逻辑
        return true;
    }
    return super.keyPressed(event);
} 
```

:::note
如果你不拥有要检查**按键**的屏幕，可以改为在[游戏事件总线][eventbus]上监听 `ScreenEvent.KeyPressed` 的 `Pre` 或 `Post` 事件。
:::

`#mouseClicked` 接收一个 `MouseButtonEvent`，其中包含鼠标 x 坐标、y 坐标和点击的 `MouseButtonInfo`，以及表示用户是否双击的 `boolean`。可以使用 `MOUSE` 输入类型，通过 `InputConstants.Type#getOrCreate` 创建输入，再与映射比较。

```java
// 在某个 Screen 子类中
@Override
public boolean mouseClicked(MouseButtonEvent event, boolean doubleClick) {
    if (EXAMPLE_MAPPING.get().isActiveAndMatches(InputConstants.Type.MOUSE.getOrCreate(event.button()))) {
        // 在此执行鼠标点击后应运行的逻辑
        return true;
    }
    return super.mouseClicked(event, doubleClick);
} 
```

:::note
如果你不拥有要检查**鼠标**的屏幕，可以改为在[游戏事件总线][eventbus]上监听 `ScreenEvent.MouseButtonPressed` 的 `Pre` 或 `Post` 事件。
:::

[eventbus]: ../concepts/events.md#registering-an-event-handler
[controls]: https://minecraft.wiki/w/Options#Controls
[tk]: ../resources/client/i18n.md#components
[keyinput]: https://www.glfw.org/docs/3.3/input_guide.html#input_key
[sides]: ../concepts/sides.md#the-physical-side
