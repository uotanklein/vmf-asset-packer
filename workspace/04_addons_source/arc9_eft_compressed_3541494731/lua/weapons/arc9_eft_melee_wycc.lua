SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_wycc") or "Antique axe"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_wycc_desc") or [[An antique axe with a damaged handle that belonged to the ancient clan of hatchlings called WYCC.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_wycc_axe.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_wycc_axe.mdl"

SWEP.DamageMax = 26

SWEP.BashDamage = 26
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.45 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 44
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.5 / 0.0254 * 2
SWEP.PreBash2Time = 0.45
SWEP.PostBash2Time = 0.5

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-8, 20, 15)
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = "draw_wycc",
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

    ["bash"] = {
        Source = "fire1_axe"
    },
    ["inspect"] = {
        Source = "inspect_wycc"
    },
    ["bash2"] = {
        Source = "fire2"
    },

    ["impact"] = {
        Source = "fire1_axe_hit"
    },
    ["impact2"] = {
        Source = "fire2_hit"
    },
}