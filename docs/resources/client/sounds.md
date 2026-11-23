# 声音

声音不是任何功能的必需品，却能让模组变得更加细腻、生动。Minecraft 提供多种注册和播放声音的方式，本文将依次介绍。

## 术语

Minecraft 声音引擎用不同术语表示不同概念：

- **声音事件（Sound event）**：代码中的触发器，告诉声音引擎播放某个声音。`SoundEvent` 也是注册到游戏中的对象。
- **声音类别（Sound category）**或**声音源（Sound source）**：对可单独控制的声音的粗略分组。声音选项 GUI 中的滑块代表这些类别，例如 `master`、`block`、`player`。代码中它们位于 `SoundSource` 枚举。
- **声音定义（Sound definition）**：声音事件到一个或多个声音对象及可选元数据的映射。声音定义位于命名空间的 [`sounds.json` 文件][soundsjson]。
- **声音对象（Sound object）**：由声音文件位置及可选元数据组成的 JSON 对象。
- **声音文件（Sound file）**：磁盘上的声音文件。Minecraft 只支持 `.ogg` 声音文件。

:::danger
由于 Minecraft 音频库 OpenAL 的实现，如果声音需要具有衰减，即随玩家与声源距离变化而改变音量，声音文件必须是单声道。立体声（多声道）文件不会衰减，并且始终在玩家位置播放，适合环境音和背景音乐。另见 [MC-146721][bug]。
:::

## 创建 `SoundEvent` {#creating-soundevents}

`SoundEvent` 属于[注册对象][registration]，因此必须通过 `DeferredRegister` 注册到游戏，并且应为单例：

```java
public class MySoundsClass {
    // 假设你的模组 ID 是 examplemod
    public static final DeferredRegister<SoundEvent> SOUND_EVENTS =
            DeferredRegister.create(BuiltInRegistries.SOUND_EVENT, "examplemod");
    
    // 所有原版声音都使用可变范围事件。
    public static final Holder<SoundEvent> MY_SOUND = SOUND_EVENTS.register(
            "my_sound",
            // 接收注册名
            SoundEvent::createVariableRangeEvent
    );
    
    // 目前还有一个未使用的方法可注册固定范围（不衰减）事件：
    public static final Holder<SoundEvent> MY_FIXED_SOUND = SOUND_EVENTS.register(
            "my_fixed_sound",
            // 16 是声音的默认范围。注意，由于 OpenAL 的限制，
            // 大于 16 的值无效，会被限制为 16。
            registryName -> SoundEvent.createFixedRangeEvent(registryName, 16f)
    );
}
```

当然，不要忘记在[模组构造方法][modctor]中把注册器添加到[模组事件总线][modbus]：

```java
public ExampleMod(IEventBus modBus) {
    MySoundsClass.SOUND_EVENTS.register(modBus);
    // 此处还有其他内容
}
```

这样就有了一个声音事件。

## `sounds.json`

_另见 [Minecraft Wiki][mcwiki] 上的 [sounds.json][mcwikisounds]。_

现在要把声音事件连接到实际声音文件，需要创建声音定义。命名空间的所有声音定义都保存在该命名空间根目录下名为 `sounds.json` 的文件中，该文件也称声音定义文件。每个声音定义把声音事件 ID（例如 `my_sound`）映射到一个 JSON 声音对象。注意声音事件 ID 不指定命名空间，因为命名空间已由声音定义文件所在目录决定。`sounds.json` 示例大致如下：

```json5
{
    // 声音事件 "examplemod:my_sound" 的声音定义
    "my_sound": {
        // 声音对象列表。若包含多个元素，会随机选择一个。
        "sounds": [
            // 只有 name 必需，其他属性均可选。
            {
                // 声音文件位置，相对于命名空间的 sounds 文件夹。
                // 本例引用 assets/examplemod/sounds/sound_1.ogg。
                "name": "examplemod:sound_1",
                // 可以是 "file" 或 "event"。"file" 表示 name 引用声音文件，
                // "event" 表示 name 引用另一个声音事件。默认 "file"。
                "type": "file",
                // 播放该声音时的音量。必须在 0.0 到 1.0（默认）之间。
                "volume": 0.8,
                // 播放该声音时的音高。必须在 0.0 到 2.0 之间。默认 1.0。
                "pitch": 1.1,
                // 从 sounds 列表中选择声音时该声音的权重。默认 1。
                "weight": 3,
                // 为 true 时，声音从文件流式读取，而不是一次性全部加载。
                // 推荐用于超过几秒的声音文件。默认 false。
                "stream": true,
                // 手动覆盖衰减距离。默认 16。固定范围声音事件会忽略此值。
                "attenuation_distance": 8,
                // 为 true 时，资源包加载时就把声音载入内存，而不是播放时才加载。
                // 原版用于水下环境音。默认 false。
                "preload": true
            },
            // { "name": "examplemod:sound_2" } 的简写
            "examplemod:sound_2"
        ]
    },
    "my_fixed_sound": {
        // 可选。为 true 时替换其他资源包中的声音，而不是追加。
        // 更多信息见下文“合并”一节。
        "replace": true,
        // 触发该声音事件时显示的字幕翻译键。
        "subtitle": "examplemod.my_fixed_sound",
        "sounds": [
            "examplemod:sound_1",
            "examplemod:sound_2"
        ]
    }
}
```

### 合并

与大多数资源文件不同，`sounds.json` 不会覆盖下层资源包中的值，而是先合并，再把结果作为一个组合后的 `sounds.json` 解析。假设两个资源包 RP1 和 RP2 的 `sounds.json` 定义了 `sound_1`、`sound_2`、`sound_3` 与 `sound_4`，其中 RP2 位于 RP1 下方：

RP1 中的 `sounds.json`：

```json5
{
    "sound_1": {
        "sounds": [
            "sound_1"
        ]
    },
    "sound_2": {
        "replace": true,
        "sounds": [
            "sound_2"
        ]
    },
    "sound_3": {
        "sounds": [
            "sound_3"
        ]
    },
    "sound_4": {
        "replace": true,
        "sounds": [
            "sound_4"
        ]
    }
}
```

RP2 中的 `sounds.json`：

```json5
{
    "sound_1": {
        "sounds": [
            "sound_5"
        ]
    },
    "sound_2": {
        "sounds": [
            "sound_6"
        ]
    },
    "sound_3": {
        "replace": true,
        "sounds": [
            "sound_7"
        ]
    },
    "sound_4": {
        "replace": true,
        "sounds": [
            "sound_8"
        ]
    }
}
```

游戏随后用于加载声音的合并结果如下（只存在于内存中，不会写入文件）：

```json5
{
    "sound_1": {
        // 均为 replace false：先添加下层资源包，再添加上层资源包
        "sounds": [
            "sound_5",
            "sound_1"
        ]
    },
    "sound_2": {
        // 上层 replace true、下层 false：只添加上层资源包
        "sounds": [
            "sound_2"
        ]
    },
    "sound_3": {
        // 上层 replace false、下层 true：先添加下层资源包，再添加上层资源包
        // 仍会丢弃位于 RP2 下方的第三个资源包中的值
        "sounds": [
            "sound_7",
            "sound_3"
        ]
    },
    "sound_4": {
        // 均为 replace true：只添加上层资源包
        "sounds": [
            "sound_8"
        ]
    }
}
```

## 播放声音

Minecraft 提供多种播放声音的方法，有时不容易判断该用哪一种。所有方法都接收 `SoundEvent`，可以是你自己的，也可以是原版声音（原版声音事件位于 `SoundEvents` 类）。下列方法说明中，客户端和服务端分别指[逻辑客户端和逻辑服务端][sides]。

### `Level`

- `playSeededSound(Entity entity, double x, double y, double z, Holder<SoundEvent> soundEvent, SoundSource soundSource, float volume, float pitch, long seed)`
    - 客户端行为：如果传入的玩家是本地玩家，就在给定位置向该玩家播放声音事件，否则不作操作。
    - 服务端行为：向除传入玩家之外的所有玩家发送数据包，指示客户端在给定位置向该玩家播放声音事件。
    - 用途：在会在两端运行的客户端发起代码中调用。服务端不向发起玩家播放，可避免该玩家听到两次。也可以从服务端发起代码（例如[方块实体][be]）调用，并把玩家参数设为 `null`，让所有玩家听到声音。
- `playSound(Entity entity, double x, double y, double z, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
    - 用随机种子和包装 `SoundEvent` 的 holder 转发到 `playSeededSound`。
- `playSound(Entity entity, BlockPos pos, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
    - 转发到上一种方法，`x`、`y`、`z` 分别取 `pos.getX() + 0.5`、`pos.getY() + 0.5`、`pos.getZ() + 0.5`。
- `playLocalSound(double x, double y, double z, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch, boolean distanceDelay)`
    - 客户端行为：在给定位置向玩家播放声音，不向服务端发送任何内容。`distanceDelay` 为 `true` 时，根据与玩家的距离延迟声音。
    - 服务端行为：不作操作。
    - 用途：在服务端发送的自定义数据包中调用。原版用于雷声。
- `playPlayerSound(SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
    - 客户端行为：在绑定到玩家位置处播放声音，不向服务端发送任何内容。
    - 服务端行为：不作操作。
    - 用途：原版用于方块环境音。

### `ClientLevel`

- `playLocalSound(BlockPos pos, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch, boolean distanceDelay)`
    - 转发到 `Level#playLocalSound`，`x`、`y`、`z` 分别取 `pos.getX() + 0.5`、`pos.getY() + 0.5`、`pos.getZ() + 0.5`。

### `Entity`

- `playSound(SoundEvent soundEvent, float volume, float pitch)`
    - 转发到 `Level#playSound`，玩家参数为 `null`，声音源为 `Entity#getSoundSource`，x/y/z 为实体位置，其余参数原样传入。

### `Player`

- `playSound(SoundEvent soundEvent, float volume, float pitch)`（重写 `Entity` 中的方法）
    - 转发到 `Level#playSound`，玩家参数为 `this`，声音源为 `SoundSource.PLAYER`，x/y/z 为玩家位置，其余参数原样传入。因此客户端/服务端行为与 `Level#playSound` 类似：
        - 客户端行为：在给定位置向客户端玩家播放声音事件。
        - 服务端行为：向给定位置附近除调用该方法玩家外的所有人播放声音事件。

## 数据生成 {#datagen}

声音文件本身当然不能[数据生成][datagen]，但 `sounds.json` 可以。继承 `SoundDefinitionsProvider` 并重写 `registerSounds()` 方法：

```java
public class MySoundDefinitionsProvider extends SoundDefinitionsProvider {
    // 参数可从 `GatherDataEvent.Client` 获取。
    public MySoundDefinitionsProvider(PackOutput output) {
        // 用实际模组 ID 替换 "examplemod"。
        super(output, "examplemod");
    }

    @Override
    public void registerSounds() {
        // 第一个参数接受 Holder<SoundEvent>、SoundEvent 或 Identifier。
        add(MySoundsClass.MY_SOUND, SoundDefinition.definition()
            // 向声音定义添加声音对象。参数为可变参数。
            .with(
                // 第一个参数接受字符串或 Identifier。
                // 第二个参数可为 SOUND 或 EVENT；若为 SOUND，可省略。
                // SOUND 类型对应前面提到的 "file" 类型。
                sound("examplemod:sound_1", SoundDefinition.SoundType.SOUND)
                    // 设置音量。也有接收 double 的重载。
                    .volume(0.8f)
                    // 设置音高。也有接收 double 的重载。
                    .pitch(1.2f)
                    // 设置权重。
                    .weight(2)
                    // 设置衰减距离。
                    .attenuationDistance(8)
                    // 启用流式加载。
                    // 还有无参重载，等价于 stream(true)。
                    .stream(true)
                    // 启用预加载。
                    // 还有无参重载，等价于 preload(true)。
                    .preload(true),
                // 最简写法。
                sound("examplemod:sound_2")
            )
            // 设置字幕。
            .subtitle("sound.examplemod.sound_1")
            // 启用替换。
            .replace(true)
        );
    }
}
```

与其他数据 provider 一样，不要忘记把 provider 注册到事件：

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MySoundDefinitionsProvider::new);
}
```

[bug]: https://bugs.mojang.com/browse/MC-146721
[datagen]: ../index.md#data-generation
[mcwiki]: https://minecraft.wiki
[mcwikisounds]: https://minecraft.wiki/w/Sounds.json
[modbus]: ../../concepts/events.md#event-buses
[modctor]: ../../gettingstarted/modfiles.md#javafml-and-mod
[registration]: ../../concepts/registries.md
[sides]: ../../concepts/sides.md#the-logical-side
[soundsjson]: #soundsjson
