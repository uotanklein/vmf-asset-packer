AddCSLuaFile( "shared.lua" )
include('shared.lua')

local pickup_sound = Sound("pills_4.wav")

function ENT:Initialize()
	self.Entity:SetModel("models/crunchy/props/contagion_props/medicine_bottle_0.mdl")
    self.Entity:PhysicsInit(SOLID_VPHYSICS)
    self.Entity:SetMoveType(MOVETYPE_VPHYSICS)
    self.Entity:SetSolid(SOLID_VPHYSICS)
    self.Entity:DrawShadow(true)
    self.Entity:SetCollisionGroup(COLLISION_GROUP_WEAPON)
    self.Entity:DropToFloor()
    local phys = self:GetPhysicsObject()
    if CLIENT then
        phys:Wake()
    end
end

function ENT:Use(plyUse)
	if ( plyUse:Health() < plyUse:GetMaxHealth() ) then
	plyUse:SetHealth( math.Clamp( plyUse:Health() + 15, 0, plyUse:GetMaxHealth() ) )
	self:EmitSound(pickup_sound)
	self:Remove()
	end
end

function ENT:OnRemove()
	self:Remove()
end