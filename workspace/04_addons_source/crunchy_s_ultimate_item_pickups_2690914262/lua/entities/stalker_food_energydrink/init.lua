AddCSLuaFile( "shared.lua" )
AddCSLuaFile( "cl_init.lua" )

include( "shared.lua" )

ENT.WorldModel = "models/crunchy/props/stalker_props/energy-drink.mdl"

if CLIENT then 
    function ENT:OnRemove()
        ParticleEffect( "water_splash_03", self:GetPos(), Angle( 0, 0, 0 ) )
    end
end

if SERVER then 
    PrecacheParticleSystem( "water_splash_03" )
end

function ENT:SpawnFunction( ply, tr, class )
	if ( !tr.Hit ) then return end
	local pos = tr.HitPos + tr.HitNormal * 4
	local ent = ents.Create( class )
	ent:SetPos( pos )
	ent:Spawn()
	ent:Activate()
	return ent
end

function ENT:Initialize()


	self:SetModel( self.WorldModel )
	self:PhysicsInit( SOLID_VPHYSICS )
	self:SetMoveType( MOVETYPE_VPHYSICS )
	self.Entity:DrawShadow(true)
	local phys = self:GetPhysicsObject()
	self.nodupe = true
	self.ShareGravgun = true

	phys:Wake()
end	

function ENT:Use( activator )
	local health = activator:Health()
	activator:SetHealth( math.Clamp( ( health or 100 ) + 10, 0, 250 ) )
	self:Remove()
	activator:EmitSound("food_drink_canned2.wav", 100, 100)
end