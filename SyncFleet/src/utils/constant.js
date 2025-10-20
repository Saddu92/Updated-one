export const AUTH_ROUTES="/auth";
export const REGISTER=`${AUTH_ROUTES}/register`;
export const LOGIN=`${AUTH_ROUTES}/login`;

export const ROOM_ROUTES="/room";
export const CREATE_ROOM=`${ROOM_ROUTES}/createRoom`;
export const JOIN_ROOM=`${ROOM_ROUTES}/joinRoom`;
export const MY_ROOM=`${ROOM_ROUTES}/myRooms`;
export const ROOM_BY_CODE = (roomCode) => `${ROOM_ROUTES}/${roomCode}`;


export const ORS_ROUTES = "/ors";
export const GEOCODE = `${ORS_ROUTES}/geocode`;
export const DIRECTIONS = `${ORS_ROUTES}/directions`;


