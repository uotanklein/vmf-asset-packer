AddCSLuaFile("cl_init.lua")
AddCSLuaFile("shared.lua")
include( "shared.lua" )

function ENT:Initialize()
	self:SetModel( "models/crunchy/props/re4_props/herb_blue.mdl" )
	self:PhysicsInit( SOLID_VPHYSICS )
	self:SetMoveType( MOVETYPE_VPHYSICS )
	self:SetSolid( SOLID_VPHYSICS )
	self.Entity:DrawShadow(true)
	local phys = self.Entity:GetPhysicsObject()
	if phys:IsValid() then
		phys:Wake()
	end
	self.isCooking = false
    self.finishBakeTime = 0
	self.poison = false
end

function ENT:StartTouch(ent)
    if ent:GetClass() == "re4_herb_green_red_mix" and self.isCooking == false then
        ent:Remove()
		self:EmitSound("herb_mix.wav")
        self.isCooking = true
        self.finishBakeTime = CurTime() + 0
    end
end

function ENT:Think()
    if self.isCooking == true then
        if self.finishBakeTime <= CurTime() then
			self.isCooking = false
			self:Remove()
			local bread = ents.Create("re4_herb_triple_mix")
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