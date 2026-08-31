SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_freeman") or "Freeman crowbar"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_freeman_desc") or [[Designed as a tool for working with hard surfaces. Materials and construction are designed to provide optimal impact and strength. The head of the axe is made of 6AL4V titanium with a thickness of 2.85 inches.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_crowbar.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_crowbar.mdl"

SWEP.DamageMax = 26

SWEP.BashDamage = 16
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.5 / 0.0254 * 2
SWEP.PreBashTime = 0.2
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 22
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.6 / 0.0254 * 2
SWEP.PreBash2Time = 0.3
SWEP.PostBash2Time = 0.4

SWEP.CustomizeAng = Angle(87, -25, -80)
SWEP.CustomizePos = Vector(-7, 30, 17)
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
        Mult = 0.8,
        Source = "fire1_axe"
    },
    ["bash2"] = {
        Source = "fire1_axe"
    },

    ["impact"] = {
        Source = "fire1_axe_hit"
    },
    ["impact2"] = {
        Source = "fire1_axe_hit"
    },
}