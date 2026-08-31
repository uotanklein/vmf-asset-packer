AddCSLuaFile( "shared.lua" )
include('shared.lua')

local pickup_sound = Sound("uh_battery_1.wav")

function ENT:Initialize()
	self.Entity:SetModel("models/crunchy/props/underhell_props/pg_battery.mdl")
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
	if ( plyUse:Armor() < plyUse:GetMaxArmor() ) then
	plyUse:SetArmor( math.Clamp( plyUse:Armor() + 10, 0, plyUse:GetMaxArmor() ) )
	self:EmitSound(pickup_sound)
	self:Remove()
	end
end

function ENT:OnRemove()
	self:Remove()
end