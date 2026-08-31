AddCSLuaFile()
SWEP.Base = "arc9_eft_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.Spawnable = true
SWEP.NotForNPCs = true

------------------------- |||           Trivia            ||| -------------------------

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_rop30")
SWEP.Description = ARC9:GetPhrase("eft_weapon_rop30_desc")

SWEP.Class = ARC9:GetPhrase("eft_class_weapon_grenadelauncher")
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_grenades")

SWEP.Trivia = {
    ["eft_trivia_manuf1"] = "eft_trivia_unknown",
    ["eft_trivia_cal2"] = "eft_trivia_calibr_30flare",
    ["eft_trivia_act3"] = "eft_trivia_act_singleuse",
    ["eft_trivia_country4"] = "eft_trivia_country_ussr",
    ["eft_trivia_year5"] = "eft_trivia_unknown"
}

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_rsp30.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_rsp30.mdl"
SWEP.DefaultSkin = 0

------------------------- |||           Offsets            ||| -------------------------

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
        self:SetSkin(self.DefaultSkin)
    end
end

SWEP.HasSights = false

SWEP.NoTPIKVMPos = true
SWEP.ActivePos = Vector(-0.7, -4.1, -0.1)
SWEP.ActiveAng = Angle(0, 0, 0)

SWEP.SprintAng = Angle(0, -40, -5)
SWEP.SprintPos = Vector(-11.7, -2, -2)

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-9.3, 21, 13.5)
SWEP.CustomizeSnapshotFOV = 65
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.TPIKforcelefthand = true
SWEP.TPIKParentToSpine4 = true  
SWEP.WorldModelOffset = {
    Pos = Vector(-7.5, 3, -14),
    Ang = Angle(20, -10, 195),

    TPIKPos = Vector(10, -1, 0),
    TPIKAng = Angle(0, 90, 90),
    Scale = 1,
}

SWEP.HoldType = "slam"
SWEP.HoldTypeSprint = "slam"
SWEP.HoldTypeHolstered = "slam"
SWEP.HoldTypeSights = "slam"
SWEP.HoldTypeCustomize = "slam"
SWEP.HoldTypeBlindfire = "pistol"

------------------------- |||           Stats            ||| -------------------------

SWEP.Spread = 3.0 * ARC9.MOAToAcc
SWEP.RPM = 80
SWEP.EFTErgo = 1
SWEP.AimDownSightsTime = 1.0
SWEP.AimDownSightsTimeHook = false
SWEP.BarrelLength = 2
SWEP.Ammo = "RPG_Round"
SWEP.Firemodes = {
    { Mode = 1 }
}

SWEP.Slot = 4


SWEP.ShootEnt = "arc9_eft_26x75_white"
SWEP.ShootEntForce = 30000
SWEP.Disposable = true
SWEP.BottomlessClip = true
SWEP.ReloadInSights = false

SWEP.SupplyLimit = 1
SWEP.ForceDefaultAmmo = 0

SWEP.AnimShoot = ACT_HL2MP_GESTURE_RANGE_ATTACK_SHOTGUN

SWEP.TriggerDelay = true
SWEP.TriggerDelayTime = 0.75
SWEP.TriggerDelayCancellable = false
SWEP.TriggerStartFireAnim = true

------------------------- |||           Recoil            ||| -------------------------

SWEP.Recoil = 0.8 -- general multiplier of main recoil

SWEP.RecoilUp   = 3.25  -- up recoil
SWEP.RecoilSide = 0.8 -- sideways recoil
SWEP.RecoilRandomUp   = 0.55 -- random up/down
SWEP.RecoilRandomSide = 0.65   -- random left/right

SWEP.RecoilAutoControl = 3.1 -- autocompenstaion, could be cool if set to high but it also affects main recoil

-- visual recoil   aka visrec
SWEP.VisualRecoil = 0.69 -- general multiplier for it

SWEP.EFT_VisualRecoilUp_BURST_SEMI   = 0.05   -- up/down tilt when semi/bursts
SWEP.VisualRecoilUp                   = 0.5   --   when fullautoing
SWEP.EFT_VisualRecoilSide_BURST_SEMI = 0.001 -- left/right tilt when semi/burst
SWEP.VisualRecoilSide                 = 0.08   --   when fullautoing
SWEP.VisualRecoilRoll = 4 -- roll tilt, a visual thing

SWEP.VisualRecoilPunch = 0.3 -- How far back visrec moves the gun
SWEP.VisualRecoilPunchSights = 5 -- same but in sights only

SWEP.VisualRecoilDampingConst = 100  -- spring settings, this is speed of visrec
SWEP.VisualRecoilSpringPunchDamping = 5 -- the less this is the more wobbly gun moves
SWEP.VisualRecoilSpringMagnitude = 0.5 -- some third element of spring, high values make gun shake asf on low fps

SWEP.VisualRecoilPositionBumpUpHipFire = 0.1 -- gun will go down each shot by this value
SWEP.VisualRecoilPositionBumpUp = -0.15 -- same but in sights
SWEP.VisualRecoilPositionBumpUpRTScope = 0.05 -- same but in rt scopes, you probably should keep it same as sight value, i guess it doesn't matter anymore after recoil update

SWEP.EFT_ShotsToSwitchToFullAutoBehaviur = 3 -- how many shots for switch to fullauto stats from semi/burst, + 2 shots afterwards are lerping. you probably should not touch this but ok

SWEP.RecoilKick = 0.3 -- camera roll each shot + makes camera go more up when fullautoing

SWEP.VisualRecoilCenter = Vector(4.28, 19, -3)
SWEP.SubtleVisualRecoil = 0.75
SWEP.SubtleVisualRecoilDirection = 2.75
SWEP.SubtleVisualRecoilSpeed = 1

------------------------- |||           Damage            ||| -------------------------
-- default bt gzh
SWEP.DamageMax = 78/1.5
SWEP.DamageMin = 51.5/1.5
SWEP.PhysBulletMuzzleVelocity = 875 /0.0254
SWEP.RangeMin = 10
SWEP.RangeMax = 1000 /0.0254

SWEP.Penetration =      1 *2.54/100/0.0254
SWEP.PenetrationDelta = 1/100
SWEP.ArmorPiercing =    1/100
SWEP.RicochetChance =   1/100

------------------------- |||           Malfunctions            ||| -------------------------

SWEP.Malfunction = false
SWEP.Overheat = false

------------------------- |||           Minor stuff            ||| -------------------------

SWEP.MuzzleParticle = "muzzleflash_m79"
SWEP.NoShellEject = true
SWEP.ShellModel = "models/weapons/arc9/darsu_eft/shells/9x19.mdl"
SWEP.ShellSounds = ARC9EFT.Shells556

SWEP.CamQCA = 2

------------------------- |||           Sounds            ||| -------------------------

local path = "weapons/darsu_eft/rsp/"

SWEP.ShootSound = path .. "handflare_fire_outdoor_close.ogg"
SWEP.ShootSoundIndoor = path .. "handflare_fire_indoor_close.ogg"

SWEP.DistantShootSound = path .. "handflare_fire_outdoor_distant.ogg"
SWEP.DistantShootSoundIndoor = path .. "handflare_fire_indoor_distant.ogg"

------------------------- |||           Dropped magazines            ||| -------------------------

SWEP.DropMagazineAmount = 1
SWEP.DropMagazineTime = 3.2
-- SWEP.DropMagazineSounds = { path .. "riffle_drop_concrete_01.ogg", path .. "riffle_drop_concrete_02.ogg", path .. "riffle_drop_concrete_03.ogg", path .. "riffle_drop_concrete_04.ogg", path .. "riffle_drop_concrete_05.ogg" }
SWEP.DropMagazineQCA = 3
SWEP.DropMagazinePos = Vector(0, 0, 0)
SWEP.DropMagazineAng = Angle(90, 0, 0)
SWEP.DropMagazineVelocity = Vector(0, 33, 0)
SWEP.DropMagazineModel = "models/weapons/arc9/darsu_eft/w_rsp30.mdl"

------------------------- |||           Animations            ||| -------------------------

SWEP.BulletBones = { 
    -- [1] = "patron_in_weapon",
}

SWEP.Hook_TranslateAnimation = function(swep, anim)
    -- local elements = swep:GetElements()
    -- if !IsFirstTimePredicted() then return end

    -- if anim == "reload" or anim == "reload_empty" then
    --     if nomag then return "reload_single" end
    --     if empty then return "reload_empty" .. mag end
    --     return anim .. mag
    -- end
end


SWEP.ReloadHideBoneTables = {
    [1] = {
        "weapon_cap_bottom",
    },
    [2] = {
        "weapon_cap_top",
        "weapon_cap_bottom",
        "rope_root",
        "rope_001",
        "rope_002",
    },
    [3] = {
        "weapon",
        "weapon_cap_top",
        "weapon_cap_bottom",
        "rope_root",
        "rope_001",
        "rope_002",
    },
}

SWEP.ReloadHideBonesFirstPerson = true

local randspin = {"arc9_eft_shared/weapon_generic_rifle_spin1.ogg","arc9_eft_shared/weapon_generic_rifle_spin2.ogg","arc9_eft_shared/weapon_generic_rifle_spin3.ogg","arc9_eft_shared/weapon_generic_rifle_spin4.ogg","arc9_eft_shared/weapon_generic_rifle_spin5.ogg","arc9_eft_shared/weapon_generic_rifle_spin6.ogg","arc9_eft_shared/weapon_generic_rifle_spin7.ogg","arc9_eft_shared/weapon_generic_rifle_spin8.ogg","arc9_eft_shared/weapon_generic_rifle_spin9.ogg","arc9_eft_shared/weapon_generic_rifle_spin10.ogg"}


SWEP.Animations = {
    ["idle"] = { 
        Source = "idle", 
        EventTable = {
            {hide = 1, t = 0},
        },
    },


    ["draw"] = { 
        Source = "draw", 
        EventTable = { 
            { s = "arc9_eft_shared/weap_in.ogg", t = 0.0 },
            { s =  path .. "handflare_open.ogg", t = 0.62 },
            {hide = 3, t = 0},
            {hide = 0, t = 0.2},
            {hide = 1, t = 2},
        }
    },

    ["holster"] = { 
        Source = "holster", 
        EventTable = { 
            { s =  path .. "item_hemostatic_injection.ogg", t = 0.52 },
            { s =  path .. "handflare_open.ogg", t = 0.88 },
            { s = "arc9_eft_shared/weap_out.ogg", t = 1.6 },
            {hide = 1, t = 0},
            {hide = 0, t = 0.1},
        }
    },


    ["fire"] = { 
        Source = {"fire1", "fire2"},
        EventTable = { 
            { s =  randspin, t = 0 },
            { s =  path .. "item_hemostatic_injection_off.ogg", t = 0.42 },
            { s =  path .. "handflare_fuze_release.ogg", t = 0.68 },
            { s =  randspin, t = 1.16 },
            {hide = 1, t = 0},
            {hide = 2, t = 0.9},
            {hide = 3, t = 1.5},
        },
        MinProgress = 1,
        NoStatAffectors = true,
        DropMagAt = 1.5,
    },
    
    ["inspect"] = {
        Source = "inspect",
        MinProgress = 0.85,
        FireASAP = true,
        EventTable = {
            { s =  randspin, t = 0.18 },
            { s =  randspin, t = 1.31 },
            { s =  randspin, t = 2 },
            {hide = 1, t = 0},
        } 
    },
}


------------------------- |||           Attachments            ||| -------------------------

-- SWEP.Attachments = {
--     {
--         PrintName = ARC9:GetPhrase("eft_cat_custom"),
--         Category = {"eft_custom_slot", "eft_custom_rpg"},
--         Bone = "weapon",
--         Pos = Vector(0, 4, -2),
--         Ang = Angle(0, -90, 0),
--         -- CosmeticOnly = true,
--     },
-- }

SWEP.DoFireAnimation = true -- own correct anim later
SWEP.Throwable = false  -- throwable but overriding throwable stuff
SWEP.NoFireDuringSighting = true

local singleusebehaviour = GetConVar("arc9_eft_singleuse_behaviour")

function SWEP:ThinkGrenade()
    -- if true then return end
    local owner = self:GetOwner()

	if self:GetSafe() and owner:KeyPressed(IN_ATTACK) then self:ToggleSafety(false) return end

	-- if self:GetSightAmount() == 0 and owner:KeyPressed(IN_ATTACK) then self:EnterSights() return end
    
    if self:GetAnimLockTime() > CurTime() then return end

    if !self:GetGrenadePrimed() then
        if self:GetGrenadeRecovering() then
            if (singleusebehaviour:GetBool() or (self:GetProcessedValue("Disposable", true) and !self:HasAmmoInClip())) and SERVER then
                self:Remove()
                owner:ConCommand("lastinv") -- switch to prev weapon
            else
                self:PlayAnimation("draw", 1, true)
                self:SetGrenadeRecovering(false)
            end
        elseif owner:KeyDown(IN_ATTACK) and self:HasAmmoInClip() and (!owner:KeyDown(IN_USE) or !self:GetProcessedValue("PrimaryBash", true)) then
            self:SetGrenadePrimed(true)
            self:SetGrenadePrimedTime(CurTime())
        end
    -- else
        -- if self:GetSightAmount() > 0.9 and owner:KeyDown(IN_ATTACK) and self:HasAmmoInClip() and (!owner:KeyDown(IN_USE) or !self:GetProcessedValue("PrimaryBash", true)) and !self:StillWaiting() then
        -- if owner:KeyDown(IN_ATTACK) and self:HasAmmoInClip() and (!owner:KeyDown(IN_USE) or !self:GetProcessedValue("PrimaryBash", true)) and !self:StillWaiting() then
            -- self:DoPrimaryAttack()
        -- end

        -- self:SetGrenadeRecovering(true)
    end
end

SWEP.Hook_PrimaryAttack = function(self)
    timer.Simple(0.75, function()
        if IsValid(self) then
            self:SetGrenadePrimed(false)
            self:SetGrenadeRecovering(true)
        end
    end)
end