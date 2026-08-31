SWEP.TFADataVersion				= 1
SWEP.Base						= "tfa_melee_base"
SWEP.Category					= "Metro Weapons"
SWEP.Author						= "Heracles421"
SWEP.Instructions				= "Primary Fire: Charge batteries in inventory"
SWEP.DrawCrosshair				= false
SWEP.PrintName					= "Hand-Held Dynamo"

SWEP.Spawnable					= true
SWEP.AdminSpawnable				= true

SWEP.Slot						= 0
SWEP.SlotPos					= 0
SWEP.AutoSwitchTo				= false
SWEP.Weight						= 0

SWEP.Type_Displayed             = "Personal Battery Charger"

SWEP.ViewModel					= "models/weapons/heracles421/metro_sweps/c_dynamo.mdl"
SWEP.ViewModelFOV				= 54
SWEP.UseHands					= true
SWEP.ViewModelPosition			= Vector(0, -5, 0)
SWEP.ViewModelAngle				= Vector(0, 0, 0)

SWEP.InspectPos					= Vector(3, -8, -5)
SWEP.InspectAng					= Vector(20, 30, 0)

SWEP.WorldModel					= "models/weapons/heracles421/metro_sweps/w_dynamo.mdl"
SWEP.HoldType					= "passive"
SWEP.ShowWorldModel				= true

SWEP.Primary.RPM				= 74
SWEP.Primary.Damage				= 0
SWEP.Primary.MaxCombo			= 0
SWEP.Primary.SplitDamage		= false
SWEP.Primary.Attacks			= {
	{
		["act"] = ACT_VM_PRIMARYATTACK,
		["len"] = 0,
		["src"] = Vector(0, 0, 0),
		["dir"] = Vector(0, 1, 0),
		["dmg"] = 0,
		["dmgtype"] = DMG_GENERIC,
		["delay"] = 0,
		["force"] = 0,
		["hull"] = 0,
		["spr"] = true,
		["snd"] = "Metro_Dynamo.Pump",
		["hitflesh"] = "",
		["hitworld"] = "",
		["snd_delay"] = 0,
		["viewpunch"] = Angle(0, 0, 0),
		["end"] = 0.80,
		["direction"] = "L",
	},
}

SWEP.Secondary.RPM				= 0
SWEP.Secondary.Damage			= 0
SWEP.Secondary.MaxCombo			= 0
SWEP.Secondary.SplitDamage		= false
SWEP.Secondary.Attacks			= {}

SWEP.DynamoCurrent = 0.3 -- How much the dynamo charges the batteries