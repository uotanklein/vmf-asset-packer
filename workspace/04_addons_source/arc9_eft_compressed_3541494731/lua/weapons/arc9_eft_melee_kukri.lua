SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_m48") or "M48 Tactical Kukri"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_m48_desc") or [[to get this knife bsg wants you to pay 250 euro. isnt it insane?
A 48 series tactical kukri manufactured by United Cutlery. Features a stainless steel blade and rubberized handle. A great addition to every survivalists arsenal!]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_kukri.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_kukri.mdl"

SWEP.DamageMax = 32

SWEP.BashDamage = 27
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.6 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 32
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.7 / 0.0254 * 2
SWEP.PreBash2Time = 0.45
SWEP.PostBash2Time = 0.5

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-10, 22, 16)
SWEP.CustomizeSnapshotFOV = 75
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = {"draw", "draw2"},
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_equip.ogg", t = 0.25 },
        }
    },

    ["holster"] = {
        Source = "holster",
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_holster.ogg", t = 0.25 },
        }
    },

    ["inspect"] = {
        Source = "inspect"
    },
    
    ["bash"] = {
        Source = "fire1"
    },
    ["bash2"] = {
        Source = "fire2"
    },

    ["impact"] = {
        Source = "fire1_hit"
    },
    ["impact2"] = {
        Source = "fire2_hit"
    },
}