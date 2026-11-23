---
sidebar_position: 2
---

# 数据组件

数据组件是映射中的键值对，用于在注册表对象的 `Holder` 上保存数据。每项数据（例如烟花爆炸或工具）都作为实际对象保存在 holder 上，因此无需动态转换通用编码实例（如 `CompoundTag`、`JsonElement`）就能查看和操作这些值。

## `DataComponentType`

每个数据组件都有一个关联的 `DataComponentType<T>`，其中 `T` 是组件值类型。`DataComponentType` 表示引用已保存组件值的键，并可包含用于磁盘和网络读写的 Codec。

现有组件列表可在 `DataComponents` 中查看。

### 创建自定义数据组件 {#creating-custom-data-components}

与 `DataComponentType` 关联的组件值必须实现 `hashCode` 和 `equals`，并且在保存后应视为**不可变**。

:::note
组件值可以使用 record 非常方便地实现。Record 的字段不可变，并自动实现 `hashCode` 和 `equals`。
:::

```java
// record 示例
public record ExampleRecord(int value1, boolean value2) {}

// 类示例
public class ExampleClass {

    private final int value1;
    // 可以为可变，但使用时必须谨慎
    private boolean value2;

    public ExampleClass(int value1, boolean value2) {
        this.value1 = value1;
        this.value2 = value2;
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.value1, this.value2);
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == this) {
            return true;
        } else {
            return obj instanceof ExampleClass ex
                && this.value1 == ex.value1
                && this.value2 == ex.value2;
        }
    }
}
```

标准 `DataComponentType` 可以通过 `DataComponentType#builder` 创建，并使用 `DataComponentType.Builder#build` 构建。构建器有四个设置：`persistent`、`networkSynchronized`、`cacheEncoding` 和 `ignoreSwapAnimation`。

`persistent` 指定把组件值读写到磁盘的 [`Codec`][codec]。`networkSynchronized` 指定跨网络读写组件的 `StreamCodec`。如果未指定 `networkSynchronized`，则会把 `persistent` 提供的 `Codec` 包装后用作 [`StreamCodec`][streamcodec]。

:::warning
构建器必须提供 `persistent` 或 `networkSynchronized` 之一，否则会抛出 `NullPointerException`。如果不应通过网络发送数据，请把 `networkSynchronized` 设为带默认组件值的 `StreamCodec#unit`。
:::

`cacheEncoding` 会缓存 `Codec` 的编码结果，如果组件值没有变化，后续编码会使用缓存值。只有预期组件值很少变化或永不变化时才应使用它。

如果物品拥有带 `ignoreSwapAnimation` 的组件，就会取消交换动画。如果未设置该选项，客户端物品属性仍可能导致动画被取消。

`DataComponentType` 是注册表对象，必须[注册][registered]。

```java
// 使用 ExampleRecord(int, boolean)
// 下面只应使用一个 Codec 和/或 StreamCodec
// 这里提供多个仅用于示例

// 基础 codec
public static final Codec<ExampleRecord> BASIC_CODEC = RecordCodecBuilder.create(instance ->
    instance.group(
        Codec.INT.fieldOf("value1").forGetter(ExampleRecord::value1),
        Codec.BOOL.fieldOf("value2").forGetter(ExampleRecord::value2)
    ).apply(instance, ExampleRecord::new)
);
public static final StreamCodec<ByteBuf, ExampleRecord> BASIC_STREAM_CODEC = StreamCodec.composite(
    ByteBufCodecs.INT, ExampleRecord::value1,
    ByteBufCodecs.BOOL, ExampleRecord::value2,
    ExampleRecord::new
);

// 不通过网络发送任何数据时使用的 unit stream codec
public static final StreamCodec<ByteBuf, ExampleRecord> UNIT_STREAM_CODEC = StreamCodec.unit(new ExampleRecord(0, false));


// 位于另一个类中
// 专用 DeferredRegister.DataComponents 简化了数据组件注册，并避免 `Supplier` 内 `DataComponentType.Builder` 的泛型推断问题
public static final DeferredRegister.DataComponents REGISTRAR = DeferredRegister.createDataComponents(Registries.DATA_COMPONENT_TYPE, "examplemod");

public static final Supplier<DataComponentType<ExampleRecord>> BASIC_EXAMPLE = REGISTRAR.registerComponentType(
    "basic",
    builder -> builder
        // 把数据读写到磁盘的 codec
        .persistent(BASIC_CODEC)
        // 跨网络读写数据的 codec
        .networkSynchronized(BASIC_STREAM_CODEC)
);

/// 不会保存到磁盘的组件
public static final Supplier<DataComponentType<ExampleRecord>> TRANSIENT_EXAMPLE = REGISTRAR.registerComponentType(
    "transient",
    builder -> builder.networkSynchronized(BASIC_STREAM_CODEC)
);

// 不会跨网络同步任何数据
public static final Supplier<DataComponentType<ExampleRecord>> NO_NETWORK_EXAMPLE = REGISTRAR.registerComponentType(
   "no_network",
   builder -> builder
        .persistent(BASIC_CODEC)
        // 注意这里使用 unit stream codec
        .networkSynchronized(UNIT_STREAM_CODEC)
);
```

## 组件映射

所有数据组件都保存在 `DataComponentMap` 中，以 `DataComponentType` 为键、组件对象为值。`DataComponentMap` 类似于只读 `Map`，因此提供通过 `DataComponentType` 调用 `#get` 取得条目的方法，也提供组件不存在时返回默认值的 `#getOrDefault`。

对于注册表对象，可以通过 `Holder#components` 取得其 `DataComponentMap`。

```java
// 对于某个 Item 实例

// 如果组件存在则取得染料颜色
// 否则为 null
@Nullable
DyeColor color = item.builtInRegistryHolder().components().get(DataComponents.BASE_COLOR);
```

### `PatchedDataComponentMap`

默认 `DataComponentMap` 只提供基于读取的操作；写入操作由子类 `PatchedDataComponentMap` 支持，包括调用 `#set` 设置组件值或调用 `#remove` 删除组件。

`PatchedDataComponentMap` 使用原型（prototype）和补丁映射（patch map）保存改动。原型是一个 `DataComponentMap`，包含该映射应拥有的默认组件及其值；补丁映射则把 `DataComponentType` 映射到包含默认组件改动的 `Optional` 值。

```java
// 对于某个 PatchedDataComponentMap map

// 把基础颜色设为白色
map.set(DataComponents.BASE_COLOR, DyeColor.WHITE);

// 删除基础颜色：
// - 如果没有默认值，则删除补丁
// - 如果有默认值，则设置空 optional
map.remove(DataComponents.BASE_COLOR);
```

:::danger
原型和补丁映射都是 `PatchedDataComponentMap` 哈希码的一部分。因此，映射中的组件值应视为**不可变**。修改数据组件的值后，必须调用 `#set` 或下文提到的相关方法。
:::

## 组件获取器

所有能够提供数据组件的实例通常都实现 `DataComponentGetter`。它通过底层映射或动态创建值，取得某个数据类型的组件值。

## 组件 Holder

所有引用底层数据组件映射的实例都实现 `DataComponentHolder`，它继承 `DataComponentGetter`。`DataComponentHolder` 本质上把调用委托给 `DataComponentMap` 中的只读方法。

```java
// 对于某个 DataComponentHolder holder

// 委托给 'DataComponentMap#get'
@Nullable
DyeColor color = holder.get(DataComponents.BASE_COLOR);
```

### `MutableDataComponentHolder`

`MutableDataComponentHolder` 是 NeoForge 提供的接口，用于支持对组件映射的写操作。原版和 NeoForge 中的所有实现都使用 `PatchedDataComponentMap` 保存数据组件，因此同名 `#set` 和 `#remove` 方法也有对应委托。

此外，`MutableDataComponentHolder` 提供 `#update` 方法：取得组件值（不存在时使用提供的默认值），对其执行操作，然后写回映射。操作器可以是接收并返回组件值的 `UnaryOperator`，也可以是接收组件值和另一个对象并返回组件值的 `BiFunction`。

```java
// 对于某个 ItemStack stack

FireworkExplosion explosion = stack.get(DataComponents.FIREWORK_EXPLOSION);

// 修改组件值
explosion = explosion.withFadeColors(new IntArrayList(new int[] {1, 2, 3}));

// 由于组件值已被修改，之后应调用 'set'
stack.set(DataComponents.FIREWORK_EXPLOSION, explosion);

// 更新组件值（内部会调用 'set'）
stack.update(
    DataComponents.FIREWORK_EXPLOSION,
    // 没有组件值时使用的默认值
    FireworkExplosion.DEFAULT,
    // 返回新的 FireworkExplosion 以写入
    explosion -> explosion.withFadeColors(new IntArrayList(new int[] {4, 5, 6}))
);

stack.update(
    DataComponents.FIREWORK_EXPLOSION,
    // 没有组件值时使用的默认值
    FireworkExplosion.DEFAULT,
    // 提供给函数的对象
    new IntArrayList(new int[] {7, 8, 9}),
    // 返回新的 FireworkExplosion 以写入
    FireworkExplosion::withFadeColors
);
```

## 为物品添加默认数据组件

可变数据组件保存在 `ItemStack` 上，但也可以通过 `Item` 设置默认组件映射，将其保存在 `Holder<Item>` 上，并在构造 `ItemStack` 时作为原型传入。可以通过 `Item.Properties#component` 把组件加入 `Item`。对于依赖动态生成数据的组件（例如[数据包注册表对象][datapackregistry]），应改用 `Item.Properties#delayedComponent`，它根据注册表 `HolderLookup.Provider` 构造值。

```java
// 对于某个 DeferredRegister.Items REGISTRAR
public static final Item COMPONENT_EXAMPLE = REGISTRAR.register("component",
    // 使用 register 而不是其他重载，因为 DataComponentType 尚未注册
    registryName -> new Item(
        new Item.Properties()
        .setId(ResourceKey.create(Registries.ITEM, registryName))
        // 直接传入组件值。
        .component(BASIC_EXAMPLE.get(), new ExampleRecord(24, true))
        // 传入组件工厂，接收注册表上下文并返回值。
        .delayedComponent(DataComponents.DAMAGE_RESISTANT, context -> new DamageResistant(context.getOrThrow(DamageTypeTags.IS_EXPLOSION)))
    )
);
```

如果要把数据组件添加到属于原版或其他模组的已有物品，应在[**模组事件总线**][modbus]上监听 `ModifyDefaultComponentsEvent`。事件提供 `modify` 和 `modifyMatching` 方法，用于修改关联物品的 `DataComponentPatch.Builder`。构建器可以 `#set` 现有组件，包括把它设为 null，从而实际删除组件。

```java
@SubscribeEvent // 在模组事件总线上
public static void modifyComponents(ModifyDefaultComponentsEvent event) {
    // 为西瓜种子设置组件
    event.modify(Items.MELON_SEEDS, builder ->
        builder.set(BASIC_EXAMPLE.get(), new ExampleRecord(10, false))
    );

    // 从所有具有合成剩余物的物品中删除组件
    event.modifyMatching(
        (item, components) -> item.getCraftingRemainder() != null,
        builder -> builder.set(DataComponents.BUCKET_ENTITY_DATA, null)
    );
}
```

## 使用自定义组件 Holder

要创建自定义数据组件 holder，只需要让对象实现 `MutableDataComponentHolder` 并实现缺少的方法。holder 对象必须包含表示 `PatchedDataComponentMap` 的字段，用于实现相关方法。

```java
public class ExampleHolder implements MutableDataComponentHolder {

    private int data;
    private final PatchedDataComponentMap components;

    // 可以提供接收映射本身的重载
    public ExampleHolder() {
        this.data = 0;
        this.components = new PatchedDataComponentMap(DataComponentMap.EMPTY);
    }

    @Override
    public DataComponentMap getComponents() {
        return this.components;
    }

    @Nullable
    @Override
    public <T> T set(DataComponentType<? super T> componentType, @Nullable T value) {
        return this.components.set(componentType, value);
    }

    @Nullable
    @Override
    public <T> T remove(DataComponentType<? extends T> componentType) {
        return this.components.remove(componentType);
    }

    @Override
    public void applyComponents(DataComponentPatch patch) {
        this.components.applyPatch(patch);
    }

    @Override
    public void applyComponents(DataComponentMap components) {
        this.components.setAll(components);
    }

    // 其他方法
}
```

### `DataComponentPatch` 与 Codec

要把组件保存到磁盘或通过网络发送，holder 可以发送整个 `DataComponentMap`。但接收方本来就已经拥有默认值，因此这样做通常会浪费信息。应使用 `DataComponentPatch` 只发送相关改动。补丁只包含组件映射的补丁信息，不包含默认值；接收方再把补丁应用到自己的原型上。

可以通过 `#patch` 从 `PatchedDataComponentMap` 创建 `DataComponentPatch`。类似地，`PatchedDataComponentMap#fromPatch` 可以根据原型 `DataComponentMap` 和 `DataComponentPatch` 构造新的 `PatchedDataComponentMap`。

```java
public class ExampleHolder implements MutableDataComponentHolder {

    public static final Codec<ExampleHolder> CODEC = RecordCodecBuilder.create(instance ->
        instance.group(
            Codec.INT.fieldOf("data").forGetter(ExampleHolder::getData),
            DataCopmonentPatch.CODEC.optionalFieldOf("components", DataComponentPatch.EMPTY).forGetter(holder -> holder.components.asPatch())
        ).apply(instance, ExampleHolder::new)
    );

    public static final StreamCodec<RegistryFriendlyByteBuf, ExampleHolder> STREAM_CODEC = StreamCodec.composite(
        ByteBufCodecs.INT, ExampleHolder::getData,
        DataComponentPatch.STREAM_CODEC, holder -> holder.components.asPatch(),
        ExampleHolder::new
    );

    // ...

    public ExampleHolder(int data, DataComponentPatch patch) {
        this.data = data;
        this.components = PatchedDataComponentMap.fromPatch(
            // 要应用补丁的原型映射
            DataComponentMap.EMPTY,
            // 关联的补丁
            patch
        );
    }

    // ...
}
```

[跨网络同步 holder 数据][network]以及把数据读写到磁盘，必须手动完成。

[datapackregistry]: ../concepts/registries.md#datapack-registries
[registered]: ../concepts/registries.md
[codec]: ../datastorage/codecs.md
[modbus]: ../concepts/events.md#event-buses
[network]: ../networking/payload.md
[streamcodec]: ../networking/streamcodecs.md
