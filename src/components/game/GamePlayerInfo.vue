<template>
  <g :transform="`translate(90 ${height - 250})`">
    <path :d="`M 0 0 h ${width - 180} v 160 h ${180 - width} Z`" fill="#e0e0e0" />
    <foreignObject :width="width - 180" height="160">
      <!-- 直接使用 opacity 属性修改文本透明度的话，在 Safari 无法正常显示 -->
      <div :style="`color: rgba(0, 0, 0, ${opacityPlayer})`" :title="player" class="player-name">{{ player }}</div>
    </foreignObject>
  </g>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { store } from '@/store'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  setup() {
    const { t } = useI18n()
    // 从原始字节数据解码得到的玩家名称
    const playerDecoded = computed(() => {
      // 如果当前游戏类型为 UPK，则显示对应的模式
      if (store.state.gameType === 'UPK') return t('game.upk')
      return new TextDecoder('utf-8').decode(store.state.playerArray).trim()
    })
    // 玩家名称
    const player = computed(() => {
      // 没有玩家姓名信息或者手动设置匿名显示玩家名称时则显示默认值
      return playerDecoded.value.length === 0 || store.state.anonymous ? t('game.anonymous') : playerDecoded.value
    })
    // 玩家名称的文本不透明度
    const opacityPlayer = computed(() => {
      // 没有玩家姓名信息、当前不是录像播放模式、手动设置匿名显示玩家名称时则置灰显示
      return playerDecoded.value.length === 0 || store.state.anonymous || store.state.gameType !== 'Video' ? 0.2 : 1
    })
    return { player, opacityPlayer }
  }
})
</script>

<style scoped>
.player-name {
  /* 设置高度避免文本被部分隐藏，可能被隐藏的文本如：English，TODO 调整 height 和 line-height 属性，让电脑和手机端显示一致，目前手机端会偏上显示 */
  height: 160px;
  overflow: hidden;
  font-size: 120px;
  /* 控制文本垂直居中 */
  line-height: 140px;
  text-align: center;
  /* 设置 white-space 属性，避免文本换行 */
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
