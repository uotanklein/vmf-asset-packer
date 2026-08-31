SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_a2607d") or "Bars A-2607 Damascus"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_a2607d_desc") or [[The Bars A-2607 knife, forged of Damascus steel with a wenge handle and brass guard.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_bars_a2607.mdl"
SWEP.DefaultSkin = 1
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_bars_a2607.mdl"

function SWEP:DrawWorldModel() -- custom func to never draw custommodel when on ground and use regular wm
    local owner = self:GetOwner()

    if IsValid(owner) and owner:GetActiveWeapon() == self then
        self:DrawCustomModel(true)
        self:DoBodygroups(true)
        self:DrawLasers(true)
        self:DoTPIK()
        self:DrawFlashlightsWM()
    else
        self:DrawModel()
        self:SetSkin(1) -- only for skin
    end
end

SWEP.DamageMax = 16

SWEP.BashDamage = 16
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.35 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 21
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.45 / 0.0254 * 2
SWEP.PreBash2Time = 0.45
SWEP.PostBash2Time = 0.5