import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "chat-list",
      component: () => import("../views/ChatList.vue"),
    },
    {
      path: "/chat/:id",
      name: "chat-room",
      component: () => import("../views/ChatRoom.vue"),
    },
  ],
});

export default router;
