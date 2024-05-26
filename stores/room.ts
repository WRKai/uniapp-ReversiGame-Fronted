import { defineStore } from "pinia"
import { ref } from "vue"
export const useRoomStore = defineStore('room', () => {
	// 房间号
	const room_number = ref('')
	const update_room_number = (nVal : string) => (room_number.value = nVal)
	const initNumber = ref(0)
	const updateinitNumber = (nVal : number) => (initNumber.value = nVal)
	return {
		room_number,
		update_room_number,
		initNumber,
		updateinitNumber
	}
},
)