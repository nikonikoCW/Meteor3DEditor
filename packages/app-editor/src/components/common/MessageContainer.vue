<template>
  <Teleport to="body">
    <div class="message-container">
      <Message
        v-for="msg in messageState.messages"
        :key="msg.id"
        :id="msg.id"
        :content="msg.content"
        :type="msg.type"
        @close="handleClose"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { messageState, message } from '../../utils/message';
import Message from './Message.vue';

const handleClose = (id) => {
  message.close(id);
};
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.message-container > * {
  pointer-events: auto;
}
</style>
