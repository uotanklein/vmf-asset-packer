AddCSLuaFile()

if CLIENT then
    killicon.Add( "apexswep", "VGUI/apexswep_killicon", Color(251, 85, 25, 255))
    SWEP.WepSelectIcon = surface.GetTextureID("VGUI/apexswep")
end

SWEP.Author			= "WebKnight/Twilight Sparkle/Internet Overdoser/Buu342"
SWEP.Instructions	= "Simple hands with Apex animations (but you can also attack)."

SWEP.Spawnable			= true
SWEP.UseHands			= true

SWEP.ViewModel			= Model( "models/weapons/c_arms_apex.mdl" )
SWEP.WorldModel			= ""

SWEP.ViewModelFOV		= 64
SWEP.BobScale		= 1.3
SWEP.SwayScale		= 1.3

SWEP.Primary.ClipSize = -1
SWEP.Primary.DefaultClip = -1
SWEP.Primary.Automatic = true
SWEP.Primary.Ammo = "none"

SWEP.Secondary.ClipSize = -1
SWEP.Secondary.DefaultClip = -1
SWEP.Secondary.Automatic = true
SWEP.Secondary.Ammo = "none"

SWEP.ViewModelFlip = false;

SWEP.AutoSwitchTo		= true
SWEP.AutoSwitchFrom		= true

SWEP.PrintName			= "Apex Hands Swep"
SWEP.Slot				= 0
SWEP.SlotPos			= 0

SWEP.DrawAmmo = false
SWEP.DrawCrosshair		= false

SWEP.DisableDuplicator = true
SWEP.BounceWeaponIcon = false
SWEP.m_bPlayPickupSound = false

SWEP.HitDistance = 60

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

sound.Add({
    name = "apexarms.deploy",
    channel = CHAN_AUTO,
    level = 65,
    volume = 1,
    pitch = {80, 110},
	sound = genOrderedTbl("weapons/Pilot_Mvmt_Foley_FistRise_1ch_v1_%i.wav", 3),
})

sound.Add({
    name = "apexarms.inspect",
    channel = CHAN_AUTO,
    level = 65,
    volume = 1,
    pitch = {80, 110},
    sound = "weapons/Mvmt_Generic_KnuckleCrack_v1_01.wav"
})

sound.Add({
    name = "apexarms.melee_swing",
    channel = CHAN_AUTO,
    level = 65,
    volume = 1,
    pitch = {90, 110},
	sound = genOrderedTbl("weapons/Pilot_Mvmt_Melee_LeftHook_1P_2ch_v1_%i.wav", 3),
	sound = genOrderedTbl("weapons/Pilot_Mvmt_Melee_RightHook_1P_2ch_v1_%i.wav", 3)
})

sound.Add({
    name = "apexarms.melee_punch",
    channel = CHAN_AUTO,
    level = 65,
    volume = 1,
    pitch = {90, 110},
	sound = genOrderedTbl("weapons/Pilot_Mvmt_Melee_Elbow_1P_2ch_v1_%i.wav", 3)
})

sound.Add({
    name = "apexarms.Uppercut_swing",
    channel = CHAN_AUTO,
    level = 65,
    volume = 1,
    pitch = {90, 110},
	sound = genOrderedTbl("weapons/Pilot_Mvmt_Melee_Uppercut_1P_2ch_v1_%i.wav", 3)
})

sound.Add({
    name = "apexarms.melee_hit",
    channel = CHAN_AUTO,
    level = 65,
    volume = 1,
    pitch = {90, 115},
	sound = genOrderedTbl("weapons/Pilot_Mvmt_Melee_Hit_Flesh_1P_2ch_v1_%i.wav", 6)
})

sound.Add({
    name = "apexarms.melee_hit_World",
    channel = CHAN_AUTO,
    level = 75,
    volume = 1,
    pitch = {90, 115},
	sound = genOrderedTbl("weapons/Imp_Player_MeleePunch_Default_1ch_v1_%i.wav", 4)
})

sound.Add({
    name = "apexarms.melee_hit_Concrete",
    channel = CHAN_AUTO,
    level = 75,
    volume = 1,
    pitch = {90, 115},
	sound = genOrderedTbl("weapons/Imp_Player_MeleePunch_Concrete_1ch_v1_%i.wav", 4)
})

sound.Add({
    name = "apexarms.melee_hit_Water",
    channel = CHAN_AUTO,
    level = 75,
    volume = 1,
    pitch = {90, 115},
	sound = genOrderedTbl("weapons/Imp_Player_MeleePunch_Water_1ch_v1_%i.wav", 4)
})

sound.Add({
    name = "apexarms.melee_hit_Metal",
    channel = CHAN_AUTO,
    level = 75,
    volume = 1,
    pitch = {90, 115},
	sound = genOrderedTbl("weapons/Imp_Player_MeleePunch_Metal_1ch_v1_%i.wav", 4)
})

sound.Add({
    name = "apex.kick_swing",
    channel = CHAN_AUTO,
    level = 65,
    volume = 1,
    pitch = {80, 115},
	sound = genOrderedTbl("weapons/Pilot_Mvmt_Melee_WallKick_1P_2ch_v1_%i.wav", 3)
})

util.PrecacheSound("apexarms.deploy")
util.PrecacheSound("apexarms.inspect")
util.PrecacheSound("apexarms.melee_swing")
util.PrecacheSound("apexarms.Uppercut_swing")
util.PrecacheSound("apexarms.melee_punch")
util.PrecacheSound("apexarms.melee_hit")
util.PrecacheSound("apexarms.melee_hit_world")
util.PrecacheSound("apexarms.melee_hit_water")
util.PrecacheSound("apexarms.melee_hit_metal")
util.PrecacheSound("apexarms.melee_hit_concrete")

util.PrecacheSound("apex.kick_swing")

local SwingSound = Sound( "apexarms.melee_swing" )
local SwingSound2 = Sound( "apexarms.melee_punch" )
local UppercutSound = Sound( "apexarms.Uppercut_swing" )

local DeploySound = Sound( "apexarms.deploy" )
local HitSound = Sound( "apexarms.melee_hit" )
local WorldHitSound = Sound( "apexarms.melee_hit_world" )
local WaterHitSound = Sound( "apexarms.melee_hit_water" )
local MetalHitSound = Sound( "apexarms.melee_hit_metal" )
local ConcreteHitSound = Sound( "apexarms.melee_hit_concrete" )
local inspectsound = Sound( "apexarms.inspect" )

if SERVER then
    util.AddNetworkString("ApexMelee_HitKillable")
end

function SWEP:SetupDataTables()

	self:NetworkVar( "Float", 0, "AnimationTime" )
	self:NetworkVar( "Float", 1, "NextMeleeAttack" )
	self:NetworkVar( "Int", 0, "Combo" )
	self:NetworkVar( "Int", 1, "AnimPriority" )
	self:NetworkVar( "String", 0, "CurrentAnim" )
	self:NetworkVar( "Bool", 0, "LastGroundState" )

end

function SWEP:Initialize()
	self:SetHoldType("fist")
end

function SWEP:SetAnim(anim, forceplay, animpriority)

    // Set the default arguments
    if (forceplay == nil) then
        forceplay = false
    end
    if (animpriority == nil) then
        animpriority = 0
    end
    
    // If we're idle, if we're forced to play this animation, then play the given animation
    if (self:IsIdle() || (forceplay && self:GetAnimPriority() <= animpriority)) then
        local vm = self.Owner:GetViewModel()
        self:SetCurrentAnim(anim)
        vm:SendViewModelMatchingSequence(vm:LookupSequence(anim))
        self:SetAnimationTime(CurTime() + vm:SequenceDuration()/vm:GetPlaybackRate())
        self:SetAnimPriority(animpriority)
    end
end

function SWEP:IsIdle()
    return self:GetCurrentAnim() == "idle1" || self:GetAnimationTime() < CurTime()
end

function SWEP:HandleAnimations()
    if (self:GetAnimationTime() != 0 && self:GetAnimationTime() < CurTime()) then
        self:SetAnimationTime(0)
        self:SetAnimPriority(0)
    end
end

function SWEP:Deploy()

	local speed = GetConVarNumber( "sv_defaultdeployspeed" )

	local vm = self.Owner:GetViewModel()
	
	self:EmitSound( DeploySound )
	self:SetHoldType("fist")
	vm:SetWeaponModel("models/weapons/c_arms_apex.mdl", self)
	vm:SetPlaybackRate(speed)
	
	-- runSpeed = self:GetOwner():GetRunSpeed()
	-- self:GetOwner():SetRunSpeed(runSpeed * 1.1)

	-- walkspeed = self:GetOwner():GetWalkSpeed()
	-- self:GetOwner():SetWalkSpeed(walkspeed * 1.1)

	self:SetNextPrimaryFire( CurTime() + vm:SequenceDuration() / speed )
	self:SetNextSecondaryFire( CurTime() + vm:SequenceDuration() / speed )
	self:SetAnim("deploy", true, 1)

	if ( SERVER ) then
		self:SetCombo( 0 )
	end

	return true

end

function SWEP:OnDrop()
	self:Remove() -- You can't drop fists
end

function SWEP:Holster()
	return true
end

function SWEP:PrimaryAttack( right )
    local currentAnimFSF = self:GetSequenceName(self.Owner:GetViewModel():GetSequence())
	self:SetHoldType("fist")
    self.Owner:SetAnimation( PLAYER_ATTACK1 )

    local anim = "fists_left"
    if ( right ) then 
        anim = "fists_right"
	end

	timer.Simple(0.1, function()
        if (!IsValid(self)) then return end
        self.Owner:ViewPunch(Angle(-1.5, -8, 0))
	end)                     

    if ( self:GetCombo() >= 2 ) then
        anim = "fists_uppercut"
		self:EmitSound( SwingSound2 )
    end
    self:SetAnim(anim, true, 3)

    self:EmitSound( SwingSound )

    //self:UpdateNextIdle()
    self:SetNextMeleeAttack( CurTime() + 0.2 )

    self:SetNextPrimaryFire( CurTime() + 0.9 )
    self:SetNextSecondaryFire( CurTime() + 0.9 )
	
	if self.Owner:Crouching() then 
        self:SetAnim("fists_uppercut2", true, 3)
        self:EmitSound( UppercutSound )
        timer.Simple( 0.2, function()
            if (!IsValid(self)) then return end
            self.Owner:ViewPunch(Angle(-7.5, -7, 0))
        end)
    end
end

local phys_pushscale = GetConVar( "phys_pushscale" )
function SWEP:DealDamage()

	local anim = self:GetSequenceName(self.Owner:GetViewModel():GetSequence())

	self.Owner:LagCompensation( true )

	local tr = util.TraceLine( {
		start = self.Owner:GetShootPos(),
		endpos = self.Owner:GetShootPos() + self.Owner:GetAimVector() * self.HitDistance,
		filter = self.Owner,
		mask = MASK_SHOT_HULL
	} )

	if ( !IsValid( tr.Entity ) ) then
		tr = util.TraceHull( {
			start = self.Owner:GetShootPos(),
			endpos = self.Owner:GetShootPos() + self.Owner:GetAimVector() * self.HitDistance,
			filter = self.Owner,
			mins = Vector( -10, -10, -8 ),
			maxs = Vector( 10, 10, 8 ),
			mask = MASK_SHOT_HULL
		} )
	end

	-- We need the second part for single player because SWEP:Think is ran shared in SP
	-- if ( tr.Hit && !( game.SinglePlayer() && CLIENT ) ) then
		-- self:EmitSound( HitSound )
	-- end

	if (tr.Hit && (SERVER || !(game.SinglePlayer() && CLIENT))) then
        if (tr.HitWorld) then
            self:EmitSound( WorldHitSound )
        elseif (tr.MatType == MAT_CONCRETE) then
            self:EmitSound( ConcreteHitSound )
        elseif (tr.MatType == MAT_WOOD) then
            self:EmitSound( WorldHitSound )
        elseif (tr.MatType == MAT_METAL) then
            self:EmitSound( MetalHitSound )
        elseif (tr.MatType == MAT_FLESH) then
            self:EmitSound( HitSound )
        else
            self:EmitSound( WorldHitSound )
        end
    end

	local hit = false
	local scale = phys_pushscale:GetFloat()

	if ( SERVER && IsValid( tr.Entity ) && ( tr.Entity:IsNPC() || tr.Entity:IsPlayer() || tr.Entity:Health() > 0 ) ) then
		local dmginfo = DamageInfo()

		local attacker = self.Owner
		if ( !IsValid( attacker ) ) then attacker = self end
		dmginfo:SetAttacker( attacker )

		dmginfo:SetInflictor( self )
		dmginfo:SetDamage( math.random( 37, 47, 100 ) )

		if ( anim == "fists_left" ) then
			dmginfo:SetDamageForce( self.Owner:GetRight() * 5912 * scale + self.Owner:GetForward() * 12998 * scale ) -- Yes we need those specific numbers
		elseif ( anim == "fists_right" ) then
			dmginfo:SetDamageForce( self.Owner:GetRight() * -5912 * scale + self.Owner:GetForward() * 12989 * scale )
		elseif ( anim == "fists_uppercut" ) then
			dmginfo:SetDamageForce( self.Owner:GetUp() * 3158 * scale + self.Owner:GetForward() * 15012 * scale )
			dmginfo:SetDamage( math.random( 55, 65, 115 ) )
		elseif ( anim == "fists_uppercut2" ) then
			dmginfo:SetDamageForce( self.Owner:GetUp() * 25158 * scale + self.Owner:GetForward() * 15012 * scale + self.Owner:GetRight() * 8912 * scale )
			dmginfo:SetDamage( math.random( 65, 115 ) )
		elseif ( anim == "fists_uppercut2_alt" ) then
			dmginfo:SetDamageForce( self.Owner:GetUp() * 25158 * scale + self.Owner:GetForward() * 15012 * scale + self.Owner:GetRight() * -8912 * scale )
			dmginfo:SetDamage( math.random( 65, 115 ) )
		elseif ( anim == "fists_elbowstrike" ) then
		    dmginfo:SetDamageForce( self.Owner:GetUp() * 3158 * scale + self.Owner:GetForward() * 11012 * scale )
			dmginfo:SetDamage( math.random( 55, 65, 115 ) )
		end

		SuppressHostEvents( NULL ) -- Let the breakable gibs spawn in multiplayer on client
		tr.Entity:TakeDamageInfo( dmginfo )
		SuppressHostEvents( self.Owner )

        hit = true
        if (tr.Entity:IsPlayer() || tr.Entity:IsNPC()) then
            net.Start("ApexMelee_HitKillable")
            net.WriteEntity(tr.Entity)
            net.Send(self.Owner)
		end

	end

	if ( IsValid( tr.Entity ) ) then
		local phys = tr.Entity:GetPhysicsObject()
		if ( IsValid( phys ) ) then
			phys:ApplyForceOffset( self.Owner:GetAimVector() * 180 * phys:GetMass() * scale, tr.HitPos )
		end
	end
	

	if ( SERVER ) then
		if ( hit && anim != "fists_uppercut" ) then
			self:SetCombo( self:GetCombo() + 1 )
		else
			self:SetCombo( 0 )
		end
	end

	self.Owner:LagCompensation( false )

end

function SWEP:SecondaryAttack()
    local currentAnimFSF = self:GetSequenceName(self.Owner:GetViewModel():GetSequence())
	self:SetHoldType("fist")
	self.Owner:SetAnimation( PLAYER_ATTACK1 )

	local anim = "fists_right"
	if ( right ) then anim = "fists_right" end
	if ( self:GetCombo() >= 2 ) then
        anim = "fists_elbowstrike"
	end

    self:SetAnim(anim, true, 3)

	timer.Simple(0.1, function()
        if (!IsValid(self)) then return end
        self.Owner:ViewPunch(Angle(-1.5, 8, 0))
	end)  

	self:EmitSound(SwingSound)

	//self:UpdateNextIdle()
	self:SetNextMeleeAttack( CurTime() + 0.2 )

	self:SetNextPrimaryFire( CurTime() + 0.9 )
	self:SetNextSecondaryFire( CurTime() + 0.9 )
	
	if self.Owner:Crouching() then 
        self:SetAnim("fists_uppercut2_alt", true, 3)
        self:EmitSound( UppercutSound )
        timer.Simple( 0.2, function()
            if (!IsValid(self)) then return end
            self.Owner:ViewPunch(Angle(-7.5, 7, 0))
        end)
    end
end

local inspectanims = { "inspect", "inspect2" }
function SWEP:Reload(right) 

    if (self:GetNextPrimaryFire() > CurTime()) then return end
    if (self:GetCurrentAnim() != inspectanims[1] && self:GetCurrentAnim() != inspectanims[2]) then
        self:SetAnim(table.Random(inspectanims), true, 2)
        self:EmitSound(inspectsound)
    end

end

function SWEP:IsMoving()
    return (self.Owner:KeyDown(IN_FORWARD) || self.Owner:KeyDown(IN_BACK) || self.Owner:KeyDown(IN_MOVELEFT) || self.Owner:KeyDown(IN_MOVERIGHT))
end

function SWEP:Think()

    local plyvel = Vector(self.Owner:GetVelocity().x, self.Owner:GetVelocity().y, 0):Length()

    self:HandleAnimations()

	local meleetime = self:GetNextMeleeAttack()
	if ( meleetime > 0 && CurTime() > meleetime ) then
		self:DealDamage()
		self:SetNextMeleeAttack( 0 )
	end

	if ( SERVER && CurTime() > self:GetNextPrimaryFire() + 0.1 ) then
		self:SetCombo( 0 )
	end
	if ( SERVER && CurTime() > self:GetNextPrimaryFire() + 0 ) then
		self:SetHoldType("normal")
	end
    
    // Handle jumping animations
    if (self.Owner:KeyPressed(IN_JUMP) && self:GetLastGroundState() == true && !self.Owner:OnGround()) then
        if (plyvel > self.Owner:GetRunSpeed()*0.9) then
            if (GetConVar("cl_apexmelee_animjumpsprint"):GetBool()) then
                self:SetAnim("jumprun", true, 1)
            end
        else
            if (GetConVar("cl_apexmelee_animjump"):GetBool()) then
                self:SetAnim("jumpstand", true, 1)
            end
        end
    end
    
    // Handle movement animations
    if (self:IsMoving() && self.Owner:OnGround() && !self.Owner:Crouching() && self.Owner:WaterLevel() < 2 && plyvel > self.Owner:GetRunSpeed()*0.9) then
        if (self:GetCurrentAnim() != "sprint") then
            if (GetConVar("cl_apexmelee_animsprint"):GetBool()) then
                self:SetAnim("sprint", true)
            else
                self:SetAnim("idle1", true)
            end
        end
    elseif (self:IsMoving() && self.Owner:OnGround() && self.Owner:WaterLevel() < 2 && (plyvel > self.Owner:GetWalkSpeed()*0.9 || (self.Owner:Crouching() && plyvel > self.Owner:GetCrouchedWalkSpeed()*0.9))) then
        if (self.Owner:Crouching() && self:GetCurrentAnim() != "crouch_walk") then
            if (GetConVar("cl_apexmelee_animcrouch"):GetBool()) then
                self:SetAnim("crouch_walk", true)
            end
        elseif (!self.Owner:Crouching() && self:GetCurrentAnim() != "walk") then
            if (GetConVar("cl_apexmelee_animwalk"):GetBool()) then
                self:SetAnim("walk", true)
            else
                self:SetAnim("idle1", true)
            end
        end
    else
        local force = false
        
        // Force if we were previously walking
        if (self:GetCurrentAnim() == "sprint" || self:GetCurrentAnim() == "crouch_walk" || self:GetCurrentAnim() == "walk") then
            force = true
        end
        
        // Force if we switched crouching
        if (self:GetCurrentAnim() == "crouch" && self.Owner:OnGround() && !self.Owner:Crouching()) then
            force = true
        elseif (self:GetCurrentAnim() == "idle1" && self.Owner:OnGround() && self.Owner:Crouching()) then
            force = true
        end
        
        if (self.Owner:Crouching() && self.Owner:OnGround()) then
            if (self:GetCurrentAnim() != "crouch") then
                if (GetConVar("cl_apexmelee_animcrouch"):GetBool()) then
                    self:SetAnim("crouch", force)
                end
            end
        elseif (self:GetCurrentAnim() != "idle1") then
            self:SetAnim("idle1", force)
        end
    end
    self:SetLastGroundState(self.Owner:OnGround())

	-- Camera Movements (Curretly Broken :( )
	-- local attachName = 'camera'
	-- local view = {}

	-- hook.Add("CalcView", "CameraMovement", function (ply, pos, angles, fov)
    -- local vm = ply:GetViewModel()
    -- local attachId = vm:LookupAttachment(attachName)

    -- local attach = vm:GetAttachment(attachId)

    -- vm:InvalidateBoneCache()

    -- view.origin = pos
    -- view.fov = fov

    -- view.angles = attach.Ang

    -- return view
	-- end)
end

-- function SWEP:DrawWeaponSelection()
-- end

function SWEP:PrintWeaponInfo()
    return false
end

if (CLIENT) then
    net.Receive("ApexMelee_HitKillable", function(len, ply)
        if (!GetConVar("cl_apexmelee_hitmarker"):GetBool()) then return end
        if (IsValid(LocalPlayer():GetActiveWeapon())) then
            LocalPlayer():GetActiveWeapon().HitMarkerEnt = net.ReadEntity()
        end
    end)

    local hitmarkeralpha = 0
    local hitmarkersize = 0
    local hitmarkerholdtime = 0
    local hitmarkercolor = Color(255, 255, 255)
    local hitmarkermat = Material("hud/apex_melee/hitmarker.png")
    function SWEP:DrawHUD()
    
        // Make the marker if we hit something
        if (LocalPlayer():GetActiveWeapon().HitMarkerEnt != nil) then
        
            // Initialize the hitmarker
            hitmarkeralpha = 255
            hitmarkersize = 128
            hitmarkerholdtime = CurTime() + 0.5
            if (!IsValid(LocalPlayer():GetActiveWeapon().HitMarkerEnt) || LocalPlayer():GetActiveWeapon().HitMarkerEnt:Health() > 0) then
                hitmarkercolor = Color(255, 255, 255)
            else
                hitmarkercolor = Color(255, 0, 0)
            end
            
            -- self:EmitSound("YourHitmarkerSoundHere")
            LocalPlayer():GetActiveWeapon().HitMarkerEnt = nil
        end
        
        // Draw it on the screen
        if (hitmarkerholdtime > CurTime()) then
            local resw = ScrW()/1600
            local resh = ScrH()/900
            local hitw = hitmarkersize*resw
            local hith = hitmarkersize*resh
            
            // Animate the marker
            hitmarkersize = Lerp(1*FrameTime(), hitmarkersize, 0)
            hitmarkeralpha = Lerp(3*FrameTime(), hitmarkeralpha, 0)
            
            // Draw the marker
            surface.SetDrawColor(hitmarkercolor.r, hitmarkercolor.g, hitmarkercolor.b, hitmarkeralpha)
            surface.SetMaterial(hitmarkermat)
            surface.DrawTexturedRect(ScrW()/2 - hitw/2, ScrH()/2 - hith/2, hitw, hith)
        end
    end
end