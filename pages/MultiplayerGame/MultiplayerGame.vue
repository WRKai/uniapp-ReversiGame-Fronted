<script setup lang="ts">
	import { computed, ref } from "vue";
	import { req } from '@/utils/http'
	import { onLoad, onHide, onShow } from '@dcloudio/uni-app'
	import { useRoomStore } from '@/stores/room'
	// const sleep = (delay : number) => new Promise((resolve) => setTimeout(resolve, delay))
	const roomStore = useRoomStore()
	const topPopupTips = ref()
	const isOffensive = ref(false)//是否先手(黑棋)
	const thisColor = computed(() => isOffensive.value ? 2 : 1)//己方的执棋颜色
	const reverseColor = computed(() => isOffensive.value ? 1 : 2)//对方的执棋颜色
	const curTurn = ref(true)//当前是谁的回合？与上面的一致，即：true为先手方回合
	var ableToClick = false
	var keepGameReq : any = null
	var interval2 : any = null
	var interval3 : any = null
	var leaveGameTimer : any = null
	var byeLastTime : boolean = false
	onHide(() => {
		leaveGameTimer = setTimeout(async () => {
			const res = await req<any>({
				url: '/api/post-spStatus',
				method: 'POST',
				data: {
					room_number: roomStore.room_number
				}
			})
			const res2 = await req<any>({
				url: '/api/post-end-game',
				method: 'POST',
				data: {
					room_number: roomStore.room_number
				}
			})
			clearAllTimers()
			uni.redirectTo({
				url: '/pages/index/index'
			})
		}, 60000)
	})
	onShow(() => {
		if (leaveGameTimer) {
			clearTimeout(leaveGameTimer)
			leaveGameTimer = null
			openPopup("离开游戏超过1分钟, 将强制退出对局!", "warn")

		}
	})
	onLoad(async () => {
		const initNumber = roomStore.initNumber
		if (initNumber) {
			// 这意味着由此方决定先后手，先上传先后手数据
			const res = await req<any>({
				url: '/api/post-init',
				method: "POST",
				data: {
					initNumber,
					room_number: roomStore.room_number
				}
			})
			if (initNumber as any % 2 == 0) {
				openPopup('你是先手', 'success')
				isOffensive.value = true
			}
			else openPopup('你是后手', 'success')
		}
		else {
			// 这意味着由对方决定先后手，尝试获取先后手数据
			uni.showLoading({
				title: '加载中...',
				mask: true,
			})
			let res : any = null;
			await new Promise((resolve) => {
				let interval1 = setInterval(async () => {
					res = await req<any>({
						url: '/api/get-init-new',
						method: "POST",
						data: {
							room_number: roomStore.room_number
						}
					})
					if (res.data.initNumber) {
						clearInterval(interval1)
						uni.hideLoading()
						resolve('OK')
					}
				}, 1080)
			})
			if (res.data.initNumber as any % 2 == 1) {
				openPopup('你是先手', 'success')
				isOffensive.value = true
			}
			else openPopup('你是后手', 'success')
		}
		colors.value[4][4] = 1
		colors.value[4][5] = 2
		colors.value[5][4] = 2
		colors.value[5][5] = 1
		keepGameReq = setInterval(async () => {
			const res = await req<any>({
				url: '/api/get-spStatus',
				method: "POST",
				data: {
					room_number: roomStore.room_number
				}
			})
			console.log(res);
			if (res.data.spStatus) {
				openPopup("对手似乎离开了游戏, 3秒后自动退出......", "warn")
				uni.showToast({
					duration: 3000,
					mask: true,
					title: '3秒后退出...',
					icon: 'error'
				})
				clearAllTimers()
				const res2 = await req<any>({
					url: '/api/post-end-game',
					method: 'POST',
					data: {
						room_number: roomStore.room_number
					}
				})
				setTimeout(() => {
					uni.redirectTo({
						url: '/pages/index/index'
					})
				}, 2999)
			}
		}, 25000)
		while (1) {
			if (isOffensive.value === curTurn.value) {
				const canPlaceChess = calculateAbleToChess(thisColor.value)
				if (!canPlaceChess) {
					openPopup("您轮空了! 又到对手了......", "warn")
					const res = await req<any>({
						url: '/api/post-latest-gaming',
						method: "POST",
						data: {
							room_number: roomStore.room_number,
							latestMsg: {
								row: -1,
								col: -1,
								turn: thisColor.value
							}
						}
					})
					if (byeLastTime) break
					byeLastTime = true
					curTurn.value = !curTurn.value
					continue
				}
				byeLastTime = false
				bigTips.value = '现在由您执棋'
				ableToClick = true
				// 原地等待操作
				await new Promise((resolve) => {
					interval2 = setInterval(() => {
						if (!ableToClick) {
							clearInterval(interval2)
							interval2 = null
							resolve('OK')
						}
					}, 1080)
				})
				curTurn.value = !curTurn.value
				bigTips.value = '等待对方......'
			}
			else {
				//置空提示数组
				ableToChess.value = new Array(10).fill(0).map(
					() => new Array(10).fill(0)
				)
				calculateAbleToChess(reverseColor.value)
				bigTips.value = '等待对方中......'
				// 原地等待操作
				let res : any = null
				await new Promise((resolve) => {
					interval3 = setInterval(async () => {
						res = await req<any>({
							url: '/api/get-latest-gaming',
							method: "POST",
							data: {
								room_number: roomStore.room_number
							}
						})
						if (res.data.latestMsg && (res.data.latestMsg.turn === reverseColor.value)) {
							clearInterval(interval3)
							interval3 = null
							resolve('OK')
						}
					}, 1080)
				})
				let r = res.data.latestMsg.row, c = res.data.latestMsg.col
				if (r === -1 && c === -1) {
					openPopup("对手轮空! 现在是我的回合!", "success")
					byeLastTime = true
					curTurn.value = !curTurn.value
					continue
				}
				byeLastTime = false
				colors.value[r][c] = reverseColor.value
				flip(r, c, reverseColor.value)
				bigTips.value = '对方已置棋!'
				curTurn.value = !curTurn.value
			}
			calculateEachChess()
		}
		openPopup("游戏结束!统计中...")
		const res2 = await req<any>({
			url: '/api/post-end-game',
			method: 'POST',
			data: {
				room_number: roomStore.room_number
			}
		})
		calculateEachChess()
		let titleStr = '还能平局?'
		if (whiteChessCnt.value > blackChessCnt.value)
			titleStr = '白棋获胜!'
		else if (whiteChessCnt.value < blackChessCnt.value)
			titleStr = '黑棋获胜!'
		uni.showModal({
			title: titleStr,
			content: `白:${whiteChessCnt.value}, 黑:${blackChessCnt.value}`,
			showCancel: false,
			confirmText: '回到主页',
			success: (succ) => {
				if (succ.confirm) {
					clearAllTimers()
					uni.redirectTo({
						url: '/pages/index/index'
					})
				}
			}
		})
	})
	const colors = ref<any>(new Array(10).fill(0).map(
		() => new Array(10).fill(0)
	))
	const ableToChess = ref<any>(new Array(10).fill(0).map(
		() => new Array(10).fill(0)
	))
	const test = async (r : number, c : number) => {
		if (!ableToClick) return openPopup("当前不是你的回合", "error")
		if (!ableToChess.value[r][c]) return openPopup("仅能在指定位置置棋(以黄点标记)", "error")
		colors.value[r][c] = thisColor.value
		flip(r, c, thisColor.value)
		ableToClick = false
		const res = await req<any>({
			url: '/api/post-latest-gaming',
			method: "POST",
			data: {
				room_number: roomStore.room_number,
				latestMsg: {
					row: r,
					col: c,
					turn: thisColor.value
				}
			}
		})
	}
	const BackToIndex = () => {
		uni.redirectTo({
			url: '/pages/index/index'
		})
	}
	const testReq = async () => {
		const res = await req<any>({
			url: '/api/get-init-new',
			method: "POST",
			data: {
				room_number: roomStore.room_number
			}
		})
		console.log(res);
	}
	const topPopupTipsType = ref("info")
	const topPopupTipsText = ref("NIHAOMA煞笔真没二")
	const openPopup = (text = '你女子', type = 'info') => {
		topPopupTipsText.value = text
		topPopupTipsType.value = type
		topPopupTips.value.open()
	}
	const dir = new Array(10).fill(0).map(() => new Array(10).fill(0).map(
		() => new Array(8).fill(0)
	))
	const calculateAbleToChess = (now : number) => {
		let flag : boolean = false
		// 计算可下的位置
		for (let i = 1; i <= 8; i++) {
			for (let j = 1; j <= 8; j++) {
				ableToChess.value[i][j] = check(i, j, now);
				if (ableToChess.value[i][j]) flag = true;
			}
		}
		return flag//如果返回的是false，表示下无可下
	}
	const mov = [[0, 1], [1, 0], [1, 1], [-1, -1], [-1, 0], [0, -1], [1, -1], [-1, 1]]
	const check = (x : number, y : number, now : number) => {
		if (colors.value[x][y]) return false
		let flag : boolean = false
		for (let i = 0; i < 8; i++) {
			dir[x][y][i] = 0
			let tx = x + mov[i][0]
			let ty = y + mov[i][1]
			if (tx < 1 || ty < 1 || tx > 8 || ty > 8) continue
			let f = colors.value[tx][ty]
			if (f && ((f - 1) !== now - 1)) {
				let tx = x, ty = y
				let ff : boolean = false
				while (1) {
					tx = tx + mov[i][0]
					ty = ty + mov[i][1]
					if (tx < 1 || ty < 1 || tx > 8 || ty > 8) break
					let f = colors.value[tx][ty]
					if (!f) break
					if (f === now) {
						flag = true
						ff = true
						break
					}
				}
				if (ff) dir[x][y][i] = 1
			}
		}
		if (flag) return true
		else return false
	}
	const testDir = () => (console.log(dir))
	const bigTips = ref('')
	const flip = (x : number, y : number, now : number) => {
		for (let i = 0; i < 8; i++) {
			let tx = x, ty = y
			if (!dir[x][y][i]) continue
			while (1) {
				tx = tx + mov[i][0]
				ty = ty + mov[i][1]
				if (tx < 1 || ty < 1 || tx > 8 || ty > 8) break
				let f = colors.value[tx][ty]
				if (!f || (f === now)) break
				colors.value[tx][ty] = ((colors.value[tx][ty] - 1) ^ 1) + 1
			}
		}
	}
	const whiteChessCnt = ref(2)
	const blackChessCnt = ref(2)
	const calculateEachChess = () => {
		let whiteChessCntTmp = 0, blackChessCntTmp = 0
		for (let i = 1; i <= 8; i++)
			for (let j = 1; j <= 8; j++) {
				if (colors.value[i][j] === 1) whiteChessCntTmp++
				else if (colors.value[i][j] === 2) blackChessCntTmp++
			}
		whiteChessCnt.value = whiteChessCntTmp
		blackChessCnt.value = blackChessCntTmp
	}
	// 退出游戏
	const exitGame = () => {
		uni.showModal({
			title: '提示',
			content: '确定退出对局?',
			confirmColor: '#C00000',
			success: async (succ) => {
				if (succ.confirm) {
					const res = await req<any>({
						url: '/api/post-spStatus',
						method: 'POST',
						data: {
							room_number: roomStore.room_number
						}
					})
					const res2 = await req<any>({
						url: '/api/post-end-game',
						method: 'POST',
						data: {
							room_number: roomStore.room_number
						}
					})
					clearAllTimers()
					uni.redirectTo({
						url: '/pages/index/index'
					})
				}
			}
		})
	}
	const clearAllTimers = () => {
		if (interval2) clearInterval(interval2)
		if (interval3) clearInterval(interval3)
		if (keepGameReq) clearInterval(keepGameReq)
		if (leaveGameTimer) clearTimeout(leaveGameTimer)
	}
</script>
<template>
	<uni-popup ref="topPopupTips" type="message">
		<uni-popup-message :type="topPopupTipsType" :message="topPopupTipsText" :duration="2000"></uni-popup-message>
	</uni-popup>
	<view class="tips-info-box">
		<view class="display-your-chess">
			<view>
				您执:
			</view>
			<view class="chess-block">
				<view class="chess" :style="{'transform':`rotateY(${isOffensive?180:0}deg)`}">
					<view class="front"></view>
					<view class="back"></view>
				</view>
			</view>
		</view>
		<view class="display-turn">
			<button class="btn" :disabled="isOffensive !== curTurn">{{bigTips}}</button>
		</view>
		<view class="exit-btn">
			<button class="btn" @click="exitGame">×</button>
		</view>
		<view class="remain-chess-cnt">
			<view class="black-remain">
				<view class="chess-block">
					<view class="chess" style="transform:rotateY(180deg)">
						<view class="front"></view>
						<view class="back"></view>
					</view>
				</view>
				<view>x{{blackChessCnt}}</view>
			</view>
			<view class="white-remain">
				<view class="chess-block">
					<view class="chess">
						<view class="front"></view>
						<view class="back"></view>
					</view>
				</view>
				<view>x{{whiteChessCnt}}</view>
			</view>
		</view>
	</view>
	<view style="height: 800rpx;margin-bottom: 250rpx;"></view>
	<view class="container">
		<view class="chess-block" v-for="(e, i) in 64" :data-row="Math.floor(i / 8) + 1" :data-col="i % 8 + 1"
			@click="test(Math.floor(i / 8) + 1, i % 8 + 1)" :data-color="0">
			<view class="able-to-chess" v-show="ableToChess[Math.floor(i / 8) + 1][i % 8 + 1]&&isOffensive === curTurn">
			</view>
			<view class="chess" v-show="colors[Math.floor(i / 8) + 1][i % 8 + 1]"
				:style="{'transform':`rotateY(${colors[Math.floor(i / 8) + 1][i % 8 + 1]==2?180:0}deg)`}">
				<view class="front"></view>
				<view class="back"></view>
			</view>
		</view>
	</view>
</template>


<style lang="scss">
	page {
		background-color: #ede0ce;
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

	.btn:active {
		transform: translateY(5px);
		box-shadow: 0px 0px 0px 0px #a29bfe;
	}

	.tips-info-box {
		height: 100rpx;
		font-size: 26px;
		position: relative;
		text-align: center;

		.display-your-chess {
			position: absolute;
			top: 100rpx;
			left: 0;
			display: flex;
			align-items: center;
			min-height: 80rpx;

			.chess-block {
				box-sizing: border-box;
				height: 75rpx;
				width: 75rpx;
				display: flex;
				justify-content: center;
				align-items: center;

				.chess {
					box-sizing: border-box;
					height: 60rpx;
					width: 60rpx;
					border-radius: 50%;
					transform-style: preserve-3d;
					position: relative;
					transition: all .6s;

					.front,
					.back {
						height: 100%;
						width: 100%;
						border-radius: 50%;
						position: absolute;
						top: 0;
						left: 0;
						backface-visibility: hidden;
					}

					.front {
						background: linear-gradient(145deg, #ffffff, #e6e6e6);
						box-shadow: 1px 1px 5rpx #cccccc,
							-1px -1px 1px #ffffff;
					}

					.back {
						background: #2b2727;
						box-shadow: 1px 1px 5rpx #221f1f,
							-1px -1px 2px #342f2f;
						transform: rotateY(180deg);
					}
				}
			}
		}


		.display-turn {
			position: absolute;
			top: 400rpx;
			left: 50%;
			transform: translate(-50%, 0);
			display: flex;
			align-items: center;
			min-height: 160rpx;
			min-width: 400rpx;

			.btn {
				font-size: 32px;
				min-width: 560rpx;
				min-height: 140rpx;
				padding: 4rpx;
				text-align: center;
			}
		}

		.exit-btn {
			position: absolute;
			top: 100rpx;
			right: 0;
			display: flex;
			align-items: center;

			.btn {
				font-size: 40px;
				min-width: 120rpx;
				line-height: 80rpx;
				text-align: center;
				height: 80rpx;
				padding: 6rpx;
			}
		}

		.remain-chess-cnt {
			position: absolute;
			top: 200rpx;
			left: 0;

			.white-remain,
			.black-remain {
				display: flex;
			}

			.chess-block {
				box-sizing: border-box;
				height: 75rpx;
				width: 75rpx;
				display: flex;
				justify-content: center;
				align-items: center;

				.chess {
					box-sizing: border-box;
					height: 60rpx;
					width: 60rpx;
					border-radius: 50%;
					transform-style: preserve-3d;
					position: relative;
					transition: all .6s;

					.front,
					.back {
						height: 100%;
						width: 100%;
						border-radius: 50%;
						position: absolute;
						top: 0;
						left: 0;
						backface-visibility: hidden;
					}

					.front {
						background: linear-gradient(145deg, #ffffff, #e6e6e6);
						box-shadow: 1px 1px 5rpx #cccccc,
							-1px -1px 1px #ffffff;
					}

					.back {
						background: #2b2727;
						box-shadow: 1px 1px 5rpx #221f1f,
							-1px -1px 2px #342f2f;
						transform: rotateY(180deg);
					}
				}
			}
		}
	}

	.container {
		padding: 24rpx;
		height: 640rpx;
		width: 640rpx;
		border-radius: 22px;
		background: linear-gradient(145deg, #fef0dc, #d5cab9);
		box-shadow: 16rpx 16rpx 20rpx #9a9286,
			-16rpx -16rpx 20rpx #ffffff;
		position: absolute;
		bottom: 5%;
		left: 50%;
		transform: translate(-50%, 0);
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;

		.chess-block {
			box-sizing: border-box;
			height: 75rpx;
			width: 75rpx;
			border-right: 3rpx dotted #c4824d;
			border-bottom: 3rpx dotted #c4824d;
			display: flex;
			justify-content: center;
			align-items: center;
			position: relative;

			.able-to-chess {
				position: absolute;
				left: 50%;
				top: 50%;
				transform: translate(-50%, -50%);
				height: 20rpx;
				width: 20rpx;
				border-radius: 50%;
				background-color: goldenrod;
			}

			&:nth-child(8n) {
				border-right: none;
			}

			&:nth-child(n+57) {
				border-bottom: none;
			}

			.chess {
				box-sizing: border-box;
				height: 60rpx;
				width: 60rpx;
				border-radius: 50%;
				transition: all .6s;
				transform-style: preserve-3d;
				position: relative;

				.front,
				.back {
					height: 100%;
					width: 100%;
					border-radius: 50%;
					position: absolute;
					top: 0;
					left: 0;
					backface-visibility: hidden;
				}

				.front {
					background: linear-gradient(145deg, #ffffff, #e6e6e6);
					box-shadow: 1px 1px 5rpx #cccccc,
						-1px -1px 1px #ffffff;
				}

				.back {
					background: #2b2727;
					box-shadow: 1px 1px 5rpx #221f1f,
						-1px -1px 2px #342f2f;
					transform: rotateY(180deg);
				}
			}
		}
	}
</style>