SWEP.Base = "arc9_base"
SWEP.Spawnable = true
SWEP.AdminOnly = false  
SWEP.NoDynamicKillIcon = false 
SWEP.NotForNPCs = true
SWEP.EntitySelectIcon = true
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_snip")
SWEP.Credits = { 
    ["eft_trivia_author1"] = "Darsu", 
    ["eft_trivia_assets2"] = "Battlestate Games LTD", 
}

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_vortex")
SWEP.ShortName = ARC9:GetPhrase("eft_weapon_vortex")
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_special")
SWEP.Trivia = {}

SWEP.Description = ARC9:GetPhrase("eft_weapon_vortex_desc")

SWEP.BarrelLength = 2
SWEP.Slot = 0
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_rangefinder.mdl"
SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_rangefinder.mdl"

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
    end
end


SWEP.ViewModelFOVBase = 65
SWEP.MirrorVMWM = true
SWEP.DefaultBodygroups = "00000000000000"

SWEP.NoTPIKVMPos = true
-- SWEP.NoTPIK = true
SWEP.CanLean = false

SWEP.Ammo = ""
SWEP.ChamberSize = 0
SWEP.ClipSize = -1
SWEP.SupplyLimit = 0 
SWEP.SecondarySupplyLimit = 0

SWEP.Firemodes = { {  Mode = 1, PrintName = "Meow" } }

SWEP.CamQCA = 1
SWEP.CamOffsetAng = Angle(0, 0, 90)
SWEP.CamQCA_Mult = 0.5
SWEP.CamQCA_Mult_ADS = 0.05

-------------------------- HANDLING

SWEP.FreeAimRadius = 0

SWEP.SprintToFireTime = 0.25

SWEP.SpeedMult = 1
SWEP.SpeedMultSights = 0.75
SWEP.SpeedMultShooting = 0.7
SWEP.SpeedMultMelee = 0.75
SWEP.SpeedMultCrouch = 1
SWEP.SpeedMultBlindFire = 1

SWEP.ShootWhileSprint = false 

-------------------------- MELEE

SWEP.Bash = false
SWEP.PrimaryBash = false
SWEP.Bash2 = false
SWEP.SecondaryBash = false

SWEP.DamageMax = 0

local path = "weapons/darsu_eft/melee/"

-------------------------- POSITIONS

SWEP.HasSights = true

SWEP.EnterSightsSound = ARC9EFT.ADSPistol
SWEP.ExitSightsSound = ARC9EFT.ADSPistol
SWEP.AimDownSightsTime = 0.55

SWEP.IronSights = {
    Pos = Vector(-4.85, -5.5, -0.253),
    Ang = Angle(0, 0, 0),
    Midpoint = { Pos = Vector(-1, 0, 8), Ang = Angle(0, 0, -145) },
    Magnification = 1,
    ViewModelFOV = 54
}


SWEP.ActivePos = Vector(-0.7, -4.1, -0.27)
SWEP.ActiveAng = Angle(0, 0, 0)

SWEP.SprintAng = Angle(0, -40, -30)
SWEP.SprintPos = Vector(-11.7, -2, -2)

SWEP.NearWallAng = Angle(0, 55, 0)
SWEP.NearWallPos = Vector(0, 0, -15)

SWEP.CrouchPos = Vector(-0.7, -3.8, .35)
SWEP.CrouchAng = Angle(0, 0, -1)

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-8, 20, 13)
SWEP.CustomizeSnapshotFOV = 60
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.HolsterPos = Vector(0, 0, 0)
SWEP.HolsterAng = Angle(0, 0, 0)

SWEP.TPIKforcelefthand = false 
SWEP.TPIKParentToSpine4 = true  

SWEP.WorldModelOffset = {
    Pos = Vector(-8.5, 2.5, -12.5),
    Ang = Angle(20, -10, 195),
    TPIKPos = Vector(7, -2, 3),
    TPIKAng = Angle(-5, 70, 90),
}


-------------------------- HoldTypes

SWEP.HoldType = "slam"
SWEP.HoldTypeSprint = "normal"
SWEP.HoldTypeHolstered = "normal"
SWEP.HoldTypeCustomize = "slam"
SWEP.HoldTypeSights = "magic"

SWEP.AnimShoot = ACT_HL2MP_GESTURE_RANGE_ATTACK_SHOTGUN
SWEP.AnimMelee = ACT_HL2MP_GESTURE_RANGE_ATTACK_SHOTGUN
SWEP.AnimReload = false
SWEP.AnimDraw = false

-------------------------- SOUNDS

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },
    ["idle_sights"] = {
        Source = "idle_sights",
    },

    ["draw"] = {
        Source = "draw",
        EventTable = {
            { s = "arc9_eft_shared/weap_in.ogg", t = 0 },
        }
    },
    ["holster"] = {
        Source = "holster",
        EventTable = {
            { s = "arc9_eft_shared/weap_out.ogg", t = 0 },
        }
    },

    ["inspect"] = {
        Source = "inspect"
    },
    ["enter_sights"] = {
        Source = "ironsight_in"
    },

    ["exit_sights"] = {
        Source = "ironsight_out"
    },
}

SWEP.AttachmentElements = {}
SWEP.CantSafety = true
-- SWEP.CantPeek = true
SWEP.CantPeek = false 
SWEP.PeekPos = Vector(0, -2.1, 0)
SWEP.PeekAng = Angle(0, 0, 0)
SWEP.NoPeekCrosshair = true
SWEP.PeekMaxFOV = 0
SWEP.PeekingIsSight = true

SWEP.FreeAimRadius = 2
SWEP.FreeAimRadiusSights = 0

SWEP.Sway = 1
SWEP.SwayMove = 0.5
SWEP.SwayMidAir = 10
SWEP.SwayMultCrouch = 0.75
SWEP.SwayMultHipFire = 0.2
SWEP.SwayMultSights = 0.1

SWEP.HoldBreathTime = 60
SWEP.RestoreBreathTime = 30
SWEP.BreathInSound = false 
SWEP.BreathOutSound = false
SWEP.BreathRunOutSound = "arc9_eft_shared/bear3_breath_sprint.ogg"

SWEP.RTScope = true
SWEP.RTScopeSubmatIndex = 2
SWEP.RTScopeFOV = 5
SWEP.RTScopeMagnification = 10
SWEP.RTScopeReticle = Material("models/weapons/arc9/darsu_eft/ranger/rangefinder_reticle.png", "mips smooth")
SWEP.RTScopeReticleScale = 1 --0.83
SWEP.RTScopeColorable = false
SWEP.RTScopeShadowIntensity = 10
SWEP.RTScopeBlackBox = true 
SWEP.RTScopeBlackBoxShadow = true 
SWEP.ScopeScreenRatio = 256/1080

if CLIENT then
    surface.CreateFont("arc9eft_ranger", { font = "Bender", size = 124, weight = 500, antialias = true, italic = true, blursize = 5 })
end

local textcolor = Color(255, 239, 22)
local text = ""
local nextcall = CurTime()

SWEP.RTScopeDrawFunc = function(swep, rtsize, sight)
    -- if wm then return end
    if !IsValid(swep:GetOwner()) or !swep:GetOwner():IsPlayer() then return end

    if CurTime() > nextcall then
        nextcall = CurTime() + 0.5
        local shoordir = swep:GetShootDir()
        if swep.raptarpleaseshutthefuckup then shoordir = shoordir + swep.raptarpleaseshutthefuckup end
        
        local trace = util.TraceLine({
            start = swep:GetShootPos(),
            endpos = swep:GetShootPos() + (shoordir:Forward() * 64000),
            mask = MASK_SHOT,
            filter = swep:GetOwner()
        })

        if trace.HitSky then
            text = "---.-"
        else
            local num = math.ceil(trace.Fraction * 640000 * ARC9.HUToM)
            text = string.format("%03d", num/10) .. "." ..num % 10
        end
    end

    surface.SetFont("arc9eft_ranger")
    surface.SetTextColor(255, 0, 0)
    surface.SetTextPos(400, 288)
    surface.DrawText(text)
end