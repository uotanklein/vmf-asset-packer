AddCSLuaFile("cl_init.lua")
AddCSLuaFile("shared.lua")
include( "shared.lua" )

function ENT:Initialize()
	self:SetModel( "models/crunchy/props/re8_props/re8_village_chem_fluid.mdl" )
	self:PhysicsInit( SOLID_VPHYSICS )
	self:SetMoveType( MOVETYPE_VPHYSICS )
	self:SetSolid( SOLID_VPHYSICS )
	self.Entity:DrawShadow(true)
	self:SetModelScale(1.75)
	local phys = self.Entity:GetPhysicsObject()
	if phys:IsValid() then
		phys:Wake()
	end
	self.isCooking = false
    self.finishBakeTime = 0
	self.poison = false
end

function ENT:StartTouch(ent)
    if ent:GetClass() == "re2_chem_fluid" and self.isCooking == false then
        ent:Remove()
		self:EmitSound("chemfluid_mix.wav")
        self.isCooking = true
        self.finishBakeTime = CurTime() + 0
    end
end

function ENT:Think()
    if self.isCooking == true then
        if self.finishBakeTime <= CurTime() then
			self.isCooking = false
			self:Remove()
			local bread = ents.Create("re2_first_aid_med")
			bread:SetPos(self:GetPos() + Vector(0, 0, 0))
			bread:Spawn()
        end
    end
end

hook.Add("PlayerDeath", "burger_timers", function(victim, inflictor, attacker)
    if timer.Exists("sound" .. victim:SteamID()) then
        timer.Remove("sound" .. victim:SteamID())
    end

    if timer.Exists("poison" .. victim:SteamID()) then
        timer.Remove("poison" .. victim:SteamID())
    end
end)