# 对象显隐

通过对象 BID 控制场景对象的显示和隐藏。对父对象设置显隐会同时影响其所有子对象的最终渲染结果。

## setObjectVisible()

```javascript
const success = meteor3d.setObjectVisible(bid, visible)
```

- `bid`：对象 BID。
- `visible`：是否可见。
- 返回 `boolean`，表示是否找到并成功设置对象。

## showObject() / hideObject()

```javascript
meteor3d.showObject(bid)
meteor3d.hideObject(bid)
```

两者均返回 `boolean`，对象不存在时返回 `false`。

## isObjectVisible()

```javascript
const visible = meteor3d.isObjectVisible(bid)
```

返回对象自身的 `visible` 标记。对象不存在时返回 `null`。父对象隐藏时，子对象自身的标记仍可能为 `true`，但最终不会被渲染。
