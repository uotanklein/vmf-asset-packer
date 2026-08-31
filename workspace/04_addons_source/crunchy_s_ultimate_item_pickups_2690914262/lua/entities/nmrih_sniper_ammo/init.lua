AddCSLuaFile( "shared.lua" )
include('shared.lua')

-- RE4 ammo pickup sound
local pickup_sound = Sound("nmrih_ammo_3.wav")

function ENT:Initialize()
    self.Entity:SetModel("models/crunchy/props/nmrih_props/ammo/ammo_308.mdl")
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

function ENT:Use( activator, caller )
    self:EmitSound(pickup_sound)
    caller:GiveAmmo(5, "SniperPenetratedRound", false)
    self:Remove();
end