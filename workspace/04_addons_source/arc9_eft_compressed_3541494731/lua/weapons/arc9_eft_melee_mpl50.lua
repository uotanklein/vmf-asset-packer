SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_mpl50") or "MPL-50 entr. tool"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_mpl50_desc") or [[MPL-50 (Malaya Pekhotnaya Lopata 50 - "Small Infantry Spade 50") is a small spade invented by a Danish officer Mads Johan Buch Linnemann in 1869. While nominally an entrenching tool, MPL-50 saw a wide range of wartime applications ranging from a close quarters combat weapon to a cooking utensil.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_mpl40.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_mpl40.mdl"

SWEP.DamageMax = 18

SWEP.BashDamage = 18
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.55 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 32
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.65 / 0.0254 * 2
SWEP.PreBash2Time = 0.45
SWEP.PostBash2Time = 0.5

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-8, 22, 15)
SWEP.CustomizeSnapshotFOV = 75
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