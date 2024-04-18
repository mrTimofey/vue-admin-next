<template lang="pug">
.bg-light.d-flex(v-if="auth.isAuthorized")
	aside.bg-white.shadow-sm
		.text-center.fs-5.fw-semibold.p-3.border-bottom
			router-link.text-decoration-none.link-dark(:to="config.appHomeLink") {{ config.appTitle }}
		.py-2.ps-3.pe-2.border-bottom
			.d-flex.align-items-center
				.fw-bold.flex-grow-1 {{ auth.userName || 'Admin' }}
				button.btn.btn-sm.btn-primary(@click.prevent="auth.logout()" :title="trans('logout')")
					i.fas.fa-right-from-bracket
		main-nav(:items="config.mainNav")
	main.p-3.flex-grow-1
		router-view
.auth-container.bg-dark.bg-gradient(v-else)
	.auth-form.bg-light.shadow-3.rounded
		.p-3.fs-5.fw-semibold.text-center.border-bottom {{ config.appTitle }}
		.p-4
			auth-form
notification-root
dialog-root
component(v-for="comp in rootComponents" :is="comp")
</template>

<script lang="ts">
import type { PropType, Component, ExtractPropTypes } from 'vue';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { get, useTranslator } from './modules/vue-composition-utils';
import AppConfig from './modules/app-config';
import MainNav from './components/main-nav/index.vue';
import AuthForm from './components/auth-form.vue';
import Meta from './modules/meta';
import AuthStore from './modules/auth/store';
import NotificationRoot from './modules/notification/notifications.vue';
import DialogRoot from './modules/modal/dialogs.vue';

const props = {
	rootComponents: {
		type: Array as PropType<Component[]>,
		default: () => [],
	},
};

export type AppProps = ExtractPropTypes<typeof props>;

export default defineComponent({
	name: 'AppRoot',
	components: {
		MainNav,
		AuthForm,
		NotificationRoot,
		DialogRoot,
	},
	props,
	setup() {
		const config = get(AppConfig);
		const meta = get(Meta);
		const auth = get(AuthStore);
		useRouter().beforeEach((to, from, next) => {
			meta.pageTitle = '';
			next();
		});
		auth.loadFromStorage();
		return {
			...useTranslator(),
			auth,
			config,
		};
	},
});
</script>

<style lang="stylus" scoped>
aside
	min-height 100vh
	width 260px
	flex none
	padding 0
.auth-container
	min-height 100vh
	padding 5rem
.auth-form
	max-width 380px
	margin 0 auto
</style>
