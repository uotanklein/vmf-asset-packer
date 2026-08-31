SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_camper") or "Camper axe"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_camper_desc") or [[A universal travel axe for use in field conditions or in household. Also works as a melee weapon if things get too desperate.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_util_axe.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_util_axe.mdl"

SWEP.DamageMax = 30

SWEP.BashDamage = 30
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.45 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 32
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.55 / 0.0254 * 2
SWEP.PreBash2Time = 0.41
SWEP.PostBash2Time = 0.5

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-8, 20, 15)
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = "draw",
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_equip.ogg", t = 0 },
        }
    },

    ["holster"] = {
        Source = "holster",
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_holster.ogg", t = 0.25 },
        }
    },

    ["inspect"] = {
        Source = "inspect_axe"
    },

    ["bash"] = {
        Source = "fire1_axe"
    },
    ["bash2"] = {
        Source = "fire2_axe"
    },

    ["impact"] = {
        Source = "fire1_axe_hit"
    },
    ["impact2"] = {
        Source = "fire2_axe_hit"
    },
}