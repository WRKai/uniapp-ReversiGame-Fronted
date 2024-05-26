<script setup lang="ts">
	import { ref } from "vue";
	import { req } from '@/utils/http'
	import { onHide } from '@dcloudio/uni-app'
	import { useRoomStore } from '@/stores/room'
	const { safeAreaInsets } = uni.getSystemInfoSync()
	onHide(() => {
		if (waitingTimer1.value) confirmCancelSearch()
	})
	const fastGamingPopupRef = ref<any>()
	const toFastGamingPage = () => {
		fastGamingPopupRef.value.open()
	}
	const formRef = ref<any>()
	const formData = ref<any>({
		room_number: ''
	})
	const rules = {
		room_number: {
			rules: [{
				required: true,
				errorMessage: '请输入房间号',
			}, {
				pattern: /^\d{4}$/,
				errorMessage: '请输入4位房间号'
			}]
		},
	}
	const confirmBtnDisabled = ref(false)
	const getRoomAndRedirect = (initNumber ?: number) => {
		confirmBtnDisabled.value = false
		uni.showToast({
			icon: 'success',
			title: '房间已找到!',
			duration: 888,
			mask: true
		})
		const roomStore = useRoomStore()
		roomStore.update_room_number(formData.value.room_number)
		roomStore.updateinitNumber(initNumber || 0)
		setTimeout(() => {
			uni.redirectTo({
				url: '/pages/MultiplayerGame/MultiplayerGame'
			})
		}, 886)
	}
	const waitingTimer1 = ref<any>(null)
	const submitRoomNumber = async () => {
		try {
			await formRef.value!.validate!()
			confirmBtnDisabled.value = true
			const res = await req<any>({
				url: '/api/search',
				method: "POST",
				data: formData.value
			})
			if (res.msg === '房间号被占用') {
				uni.showToast({
					icon: 'error',
					title: res.msg,
					duration: 888,
					mask: true
				})
				setTimeout(() => (confirmBtnDisabled.value = false), 888)
				return
			}
			if (res.data.isWaiting) {
				waitingTimer1.value = setInterval(async () => {
					const res2 = await req<any>({
						url: '/api/confirm-pair',
						method: "POST",
						data: formData.value
					})
					console.log(res2);
					if (!res2.data.isWaiting) {
						clearInterval(waitingTimer1.value)
						waitingTimer1.value = null
						getRoomAndRedirect()
					}
				}, 1080)
			}
			else if (!res.data.isWaiting) getRoomAndRedirect(Math.floor(Math.random() * 10) + 1)
		} catch (e) {
			console.log(e)
			setTimeout(() => (confirmBtnDisabled.value = false), 233)
		}
	}
	const dealCancelSearchRoom = () => {
		if (!waitingTimer1.value) return fastGamingPopupRef.value.close()
		uni.showModal({
			title: '提示',
			content: '确定取消房间搜索吗?',
			confirmColor: '#C00000',
			cancelText: '还是算了',
			success: async (res) => {
				if (res.confirm) {
					confirmCancelSearch()
					return
				}
			}
		})
	}
	const confirmCancelSearch = async () => {
		const res = await req<any>({
			url: '/api/cancel-search',
			method: "DELETE",
			data: formData.value
		})
		console.log(res);
		clearInterval(waitingTimer1.value)
		waitingTimer1.value = null
		uni.showToast({
			icon: 'success',
			title: '取消成功',
			duration: 888,
			mask: true
		})
		confirmBtnDisabled.value = false
	}
	const toComingSoon = () => {
		uni.showModal({
			title: '怎么可能3天写这么多',
			content: '敬(Wa)请(Keng)期(Bu)待(Tian)!',
			showCancel: false
		})
	}
</script>
<template>
	<view :style="{height:safeAreaInsets?.top + 'px'}"></view>
	<view class="big-title">
		<text>黑</text><text style="color: aliceblue;">白</text>棋
	</view>
	<view class="version-display">
		Android DEMO v0.0.2 with Node.js Server v0.0.1
	</view>
	<view class="version-display">
		By Rongkai Wang
	</view>
	<view class="version-display">
		Special thanks to Mayor & Moxin for their algorithms
	</view>
	<view class="play-btns">
		<button class="btn coming-soon" @click="toComingSoon">双人黑白棋-自定义</button>
		<button class="btn coming-soon" @click="toComingSoon">单人黑白棋-PvAI</button>
		<button class="btn coming-soon" @click="toComingSoon">双人黑白棋-单机版</button>
		<button class="btn" @click="toFastGamingPage">双人黑白棋-快速赛</button>
	</view>
	<uni-popup ref="fastGamingPopupRef" background-color="#fff" type="center" :is-mask-click="false">
		<view class="fastGamingPopup-content">
			<view class="tips-title">
				和朋友输入相同四位数字房间号,
			</view>
			<view class="tips-title">
				就可以进入同一对局!
			</view>
			<uni-forms ref="formRef" :rules="rules" :model="formData">
				<uni-forms-item name="room_number">
					<uni-easyinput class="room-number-inp" :inputBorder="true" placeholder="请输入房间号" type="number"
						maxlength="4" v-model="formData.room_number" :disabled="confirmBtnDisabled"></uni-easyinput>
				</uni-forms-item>
			</uni-forms>
			<uni-load-more color="#6c5ce7" status="loading" v-show="!!waitingTimer1" :content-text="{
					contentdown: 'BUG',
					contentrefresh: '等待玩家中......',
					contentnomore: 'BUG'
				}" />
			<view class="btns">
				<button class="btn" @click="submitRoomNumber" :disabled="confirmBtnDisabled">确定</button>
				<button class="btn cancelBtn" @click="dealCancelSearchRoom">取消</button>
			</view>
		</view>
	</uni-popup>
</template>


<style lang="scss">
	page {
		background-color: #ede0ce;
	}

	.big-title {
		height: 200rpx;
		font-size: 50px;
		text-align: center;
		line-height: 200rpx;
	}

	.version-display {
		height: 40rpx;
		font-size: 14px;
		text-align: center;
		line-height: 40rpx;
		color: darkgray;
	}

	.play-btns {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 800rpx;
		justify-content: space-between;
		margin: 100rpx;

		.btn {
			margin: 20rpx;
		}
	}

	.container {
		padding: 20px;
		font-size: 14px;
		line-height: 24px;
		height: 80vw;
		width: 80vw;
		border-radius: 22px;
		background: linear-gradient(145deg, #fef0dc, #d5cab9);
		box-shadow: 10px 10px 12px #9a9286,
			-10px -10px 12px #ffffff;
	}

	.btn {
		border: none;
		outline: none;
		background-color: #6c5ce7;
		padding: 10px 20px;
		font-size: 30rpx;
		font-weight: 700;
		color: #fff;
		border-radius: 6px;
		transition: all ease 0.1s;
		box-shadow: 0px 5px 0px 0px #a29bfe;
		display: inline-block;
	}

	.coming-soon {
		background-color: #f7f7f7;
		color: #acacac;
	}

	.btn:active {
		transform: translateY(5px);
		box-shadow: 0px 0px 0px 0px #a29bfe;
	}

	.fastGamingPopup-content {
		padding: 20rpx 30rpx;
		min-height: 440rpx;
		width: 500rpx;
		border-radius: 50%;
		background-color: #fff;
		display: flex;
		flex-direction: column;
		justify-content: center;

		.tips-title {
			color: gray;
			font-size: 15px;
			text-align: center;
		}

		.room-number-inp {
			margin-top: 20rpx;
		}

		.btns {
			display: flex;
			justify-content: space-between;
			margin-top: 50rpx;

			.btn {
				width: 200rpx;
			}

			.cancelBtn {
				background-color: #fff;
				color: #6c5ce7;
			}
		}
	}
</style>