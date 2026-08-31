if SERVER then return end
//{

local function genOrderedTbl(str, min, max)
	if not min then min = 1 end
	if not max then
		max = min
		min = 1
	end
	local tbl = {}
	for i = min, max do
		table.insert(tbl, str:format(i))
	end
	return tbl
end

local soundData = {
    name        = "apex.kick_swing",
    channel     = CHAN_USER_BASE+1,
    volume      = 1,
    soundlevel  = 100,
    pitchstart  = 100,
    pitchend    = 100,
    sound       = "weapons/Pilot_Mvmt_Melee_WallKick_1P_2ch_v1_1.wav"
}
sound.Add(soundData)

local soundData = {
    name        = "Apex_Cloth",
    channel     = CHAN_USER_BASE+1,
    volume      = 1,
    soundlevel  = 100,
    pitch       = {90, 110},
    sound       = genOrderedTbl("player/gear/Mvmt_LightClass_Gear_Sprint_2ch_v1_%i.wav", 11)
}
sound.Add(soundData)

local soundData = {
    name        = "Apex_Gear_Sprint",
    channel     = CHAN_USER_BASE+1,
    volume      = 0.2,
    soundlevel  = 100,
    pitch       = {90, 110},
    sound       = genOrderedTbl("player/gear/Mvmt_Mirage_Gear_Packs_Sprint_1ch_v1_%i.wav", 20)
}
sound.Add(soundData)

local soundData = {
    name        = "Apex_Cloth_Jump",
    channel     = CHAN_USER_BASE+1,
    volume      = 0.8,
    soundlevel  = 100,
    pitch       = {90, 110},
    sound       = genOrderedTbl("player/gear/Mvmt_LightClass_Gear_Jump_2ch_v2_%i.wav", 6)
}
sound.Add(soundData)

local soundData = {
    name        = "Apex_Gear_Jump",
    channel     = CHAN_USER_BASE+1,
    volume      = 0.7,
    soundlevel  = 100,
    pitch       = {90, 110},
    sound       = genOrderedTbl("player/gear/Mvmt_Mirage_Gear_Packs_Jump_1ch_v1_%i.wav", 6)
}
sound.Add(soundData)
//}